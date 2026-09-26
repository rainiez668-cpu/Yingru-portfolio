#!/usr/bin/env python3
"""Create deterministic dither + ASCII studies from selected hand frames.

By default the script processes only hand_01, hand_10, and hand_20 and writes
the C4 study for each image. It uses Pillow only.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


BACKGROUND = (244, 243, 237)  # #F4F3ED
MAIN_BLUE = (124, 203, 240)  # #7CCBF0
SECONDARY_BLUE = (101, 191, 233)  # #65BFE9
ACCENT_BLUE = (72, 172, 224)  # #48ACE0

C2_LIGHT_BLUE = (157, 220, 244)  # #9DDCF4
C2_PRIMARY_BLUE = (120, 201, 236)  # #78C9EC
C2_ACCENT_BLUE = (85, 181, 223)  # #55B5DF

C3_LIGHT_BLUE = (145, 213, 242)  # #91D5F2
C3_PRIMARY_BLUE = (108, 195, 233)  # #6CC3E9
C3_ACCENT_BLUE = (74, 174, 223)  # #4AAEDF
C_ASCII_BLUE = (38, 151, 212)  # #2697D4

# C4 only recolors the existing C raster marks; it does not regenerate them.
C4_HIGHLIGHT_BLUE = (151, 211, 239)  # #97D3EF
C4_MIDTONE_BLUE = (124, 199, 235)  # #7CC7EB
C4_SHADOW_BLUE = (91, 181, 225)  # #5BB5E1

DEFAULT_INPUTS = (
    Path("assets/hands/raw/hand_01.png"),
    Path("assets/hands/raw/hand_10.png"),
    Path("assets/hands/raw/hand_20.png"),
)
DEFAULT_OUTPUT_DIR = Path("assets/hands/test-stylized")

VARIANTS = {
    "D1": 0.80,
    "D2": 0.68,
    "D3": 0.58,
}

COARSE_SCALE = 2

# Same fixed ASCII grid for D1/D2/D3. Relative to the former C study, density
# is about +10% and type size is about -5%.
ASCII_SETTINGS = {"cell": 19, "density": 1.06, "font_ratio": 0.80}

# Exact grid, density, and type size from the existing C version.
C2_ASCII_SETTINGS = {"cell": 19, "density": 0.96, "font_ratio": 0.84}
C2_WORK_SCALE = 0.80  # 1 / 0.8 = 1.25× visible dither structure.
C3_WORK_SCALE = 0.75  # 1 / 0.75 = 1.33× the original C structure.


def sample_background(image: Image.Image) -> tuple[int, int, int]:
    """Estimate the source background from narrow, subject-free edge strips."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    strips = (
        (0, 0, width, max(1, height // 12)),
        (0, 0, max(1, width // 16), height // 2),
        (width - max(1, width // 16), 0, width, height // 2),
    )
    histograms = [[0] * 256 for _ in range(3)]
    sample_count = 0
    for box in strips:
        crop = rgb.crop(box)
        sample_count += crop.width * crop.height
        for channel_index, channel in enumerate(crop.split()):
            histogram = channel.histogram()
            histograms[channel_index] = [
                current + addition
                for current, addition in zip(histograms[channel_index], histogram)
            ]

    midpoint = (sample_count + 1) // 2
    medians = []
    for histogram in histograms:
        cumulative = 0
        for value, count in enumerate(histogram):
            cumulative += count
            if cumulative >= midpoint:
                medians.append(value)
                break
    return tuple(medians)


def make_hand_mask(image: Image.Image, source_background: tuple[int, int, int]) -> Image.Image:
    """Build a softly antialiased mask from distance to the neutral background."""
    background_image = Image.new("RGB", image.size, source_background)
    difference = ImageChops.difference(image.convert("RGB"), background_image)
    red, green, blue = difference.split()

    # Max-channel distance preserves pale skin edges better than luminance-only
    # thresholding.  Values below 8 are background; 30+ are fully foreground.
    distance = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    distance_mask = distance.point(
        lambda value: max(0, min(255, round((value - 8) * 255 / 22)))
    )

    # Skin is redder than the near-neutral background. Combining Cr with RGB
    # distance rejects faint floor/shadow variations that are not part of a hand.
    chroma_red = image.convert("YCbCr").split()[2]
    skin_mask = chroma_red.point(
        lambda value: max(0, min(255, round((value - 132) * 255 / 13)))
    )
    mask = ImageChops.darker(distance_mask, skin_mask)
    mask = mask.filter(ImageFilter.MedianFilter(3))
    return mask.filter(ImageFilter.GaussianBlur(0.65))


def enhanced_grayscale(image: Image.Image, mask: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(image)
    hard_mask = mask.point(lambda value: 255 if value >= 24 else 0)
    gray = ImageOps.autocontrast(gray, cutoff=(1.0, 1.0), mask=hard_mask)
    return ImageEnhance.Contrast(gray).enhance(1.35)


def floyd_steinberg(
    probabilities: list[float], eligible: list[bool], width: int, height: int
) -> list[bool]:
    """Error-diffuse ink probabilities into discrete on/off marks."""
    work = probabilities.copy()
    marks = [False] * (width * height)
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if not eligible[index]:
                continue
            old_value = max(0.0, min(1.0, work[index]))
            new_value = 1.0 if old_value >= 0.5 else 0.0
            marks[index] = bool(new_value)
            error = old_value - new_value
            for dx, dy, weight in (
                (1, 0, 7 / 16),
                (-1, 1, 3 / 16),
                (0, 1, 5 / 16),
                (1, 1, 1 / 16),
            ):
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    neighbour = ny * width + nx
                    if eligible[neighbour]:
                        work[neighbour] += error * weight
    return marks


def coarse_dither_layer(
    gray: Image.Image, mask: Image.Image, target_coverage: float
) -> tuple[Image.Image, Image.Image, float]:
    """Dither at 1/2 resolution, then enlarge as hard-edged raster marks."""
    width, height = gray.size
    low_size = (
        max(1, round(width / COARSE_SCALE)),
        max(1, round(height / COARSE_SCALE)),
    )

    # Blurring before reduction deliberately discards photographic skin detail.
    low_gray = gray.filter(ImageFilter.GaussianBlur(1.35)).resize(
        low_size, Image.Resampling.LANCZOS
    )
    low_mask = mask.resize(low_size, Image.Resampling.BOX)
    low_width, low_height = low_size
    gray_pixels = list(low_gray.get_flattened_data())
    mask_pixels = list(low_mask.get_flattened_data())
    eligible = [value >= 38 for value in mask_pixels]

    eligible_count = sum(eligible)
    if not eligible_count:
        empty = Image.new("RGB", gray.size, BACKGROUND)
        return empty, Image.new("L", gray.size, 0), 0.0

    darkness = [1.0 - value / 255.0 for value in gray_pixels]
    mean_darkness = (
        sum(value for value, use in zip(darkness, eligible) if use) / eligible_count
    )

    def make_probabilities(offset: float) -> list[float]:
        values: list[float] = []
        for tone, edge, use in zip(darkness, mask_pixels, eligible):
            if not use:
                values.append(0.0)
                continue
            # Tone affects density, never opacity. Partial low-res mask values
            # lower edge density, creating restrained raster erosion.
            edge_factor = min(1.0, edge / 190.0) ** 1.25
            probability = target_coverage + 0.58 * (tone - mean_darkness) + offset
            values.append(max(0.0, min(1.0, probability * edge_factor)))
        return values

    # Calibrate the binary result so each label lands near its requested visual
    # coverage despite edge erosion and probability clipping.
    offset = 0.0
    marks: list[bool] = []
    actual = 0.0
    for _ in range(6):
        marks = floyd_steinberg(make_probabilities(offset), eligible, low_width, low_height)
        actual = sum(marks) / eligible_count
        offset += (target_coverage - actual) * 0.9

    low_layer = Image.new("RGB", low_size, BACKGROUND)
    low_layer_pixels = low_layer.load()
    for y in range(low_height):
        for x in range(low_width):
            index = y * low_width + x
            if not marks[index]:
                continue
            tone = darkness[index]
            score = fixed_score(x, y)
            if tone > 0.72 and score < 0.08:
                color = ACCENT_BLUE
            elif tone > 0.48 and score < 0.58:
                color = SECONDARY_BLUE
            else:
                color = MAIN_BLUE
            low_layer_pixels[x, y] = color

    # Nearest-neighbour is essential: no fine blue texture is introduced here.
    layer = low_layer.resize(gray.size, Image.Resampling.NEAREST)
    low_shape = low_mask.point(lambda value: 255 if value >= 38 else 0)
    shape = low_shape.resize(gray.size, Image.Resampling.NEAREST)
    return layer, shape, actual


def multitone_floyd_steinberg(gray: Image.Image) -> Image.Image:
    """Four-level FS dither: warm-white paper plus three fixed cyan inks."""
    width, height = gray.size
    work = [min(255.0, value + 7.0) for value in gray.get_flattened_data()]
    # Fixed tonal anchors keep the mapping stable between animation frames.
    levels = (245.0, 205.0, 155.0, 90.0)
    colors = (BACKGROUND, C2_LIGHT_BLUE, C2_PRIMARY_BLUE, C2_ACCENT_BLUE)
    indices = [0] * (width * height)

    for y in range(height):
        for x in range(width):
            index = y * width + x
            old_value = max(0.0, min(255.0, work[index]))
            level_index = min(
                range(len(levels)), key=lambda candidate: abs(old_value - levels[candidate])
            )
            indices[index] = level_index
            error = old_value - levels[level_index]
            for dx, dy, weight in (
                (1, 0, 7 / 16),
                (-1, 1, 3 / 16),
                (0, 1, 5 / 16),
                (1, 1, 1 / 16),
            ):
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    work[ny * width + nx] += error * weight

    result = Image.new("RGB", gray.size)
    result.putdata([colors[index] for index in indices])
    return result


def fragmented_edge_mask(mask: Image.Image) -> Image.Image:
    """Add restrained, deterministic erosion in a 7 px inner/outer edge band."""
    width, height = mask.size
    hard = mask.point(lambda value: 255 if value >= 52 else 0)
    inner = hard.filter(ImageFilter.MinFilter(15))
    outer = hard.filter(ImageFilter.MaxFilter(15))
    hard_pixels = hard.get_flattened_data()
    inner_pixels = inner.get_flattened_data()
    outer_pixels = outer.get_flattened_data()
    output = [0] * (width * height)

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if inner_pixels[index]:
                output[index] = 255
                continue
            score = fixed_score(x, y)
            if hard_pixels[index]:
                # About 10–20% restrained dropout just inside the contour.
                output[index] = 255 if score >= 0.15 else 0
            elif outer_pixels[index]:
                # A few fixed raster flecks beyond the contour soften cut-out edges.
                output[index] = 255 if score < 0.11 else 0

    result = Image.new("L", mask.size)
    result.putdata(output)
    return result


def c2_dither_layer(gray: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Render C2 at a subtly larger scale, then apply fixed edge erosion."""
    width, height = gray.size
    work_size = (
        max(1, round(width * C2_WORK_SCALE)),
        max(1, round(height * C2_WORK_SCALE)),
    )
    work_gray = gray.resize(work_size, Image.Resampling.LANCZOS)
    low_layer = multitone_floyd_steinberg(work_gray)
    layer = low_layer.resize(gray.size, Image.Resampling.NEAREST)
    edge_mask = fragmented_edge_mask(mask)

    result = Image.new("RGB", gray.size, BACKGROUND)
    result.paste(layer, mask=edge_mask)
    return result, edge_mask


def c3_dither_layer(gray: Image.Image, mask: Image.Image) -> tuple[Image.Image, float]:
    """Render a mostly blue, three-tone hand with a subtle paper-dot texture."""
    width, height = gray.size
    work_size = (
        max(1, round(width * C3_WORK_SCALE)),
        max(1, round(height * C3_WORK_SCALE)),
    )
    low_gray = gray.resize(work_size, Image.Resampling.LANCZOS)
    low_mask = mask.resize(work_size, Image.Resampling.BOX)
    low_width, low_height = work_size
    gray_pixels = list(low_gray.get_flattened_data())
    mask_pixels = list(low_mask.get_flattened_data())
    eligible = [value >= 38 for value in mask_pixels]

    # Keep roughly 82–89% blue. Highlights remain predominantly light blue;
    # paper-colored FS marks are texture rather than large transparent holes.
    blue_probabilities = []
    for brightness, edge, use in zip(gray_pixels, mask_pixels, eligible):
        if not use:
            blue_probabilities.append(0.0)
            continue
        darkness = 1.0 - brightness / 255.0
        coverage = 0.90 + 0.05 * darkness
        # Keep the outer transition almost continuous. Paper-colored texture is
        # concentrated inside the hand rather than used to eat away its shape.
        if edge < 235:
            coverage = 0.98
        blue_probabilities.append(max(0.0, min(1.0, coverage)))

    blue_marks = floyd_steinberg(
        blue_probabilities, eligible, low_width, low_height
    )
    eligible_count = max(1, sum(eligible))
    actual_coverage = sum(blue_marks) / eligible_count

    low_layer = Image.new("RGB", work_size, BACKGROUND)
    pixels = low_layer.load()
    for y in range(low_height):
        for x in range(low_width):
            index = y * low_width + x
            if not blue_marks[index]:
                continue
            brightness = gray_pixels[index]
            # Three discrete inks follow the source luminance. A fixed threshold
            # offset alternates borderline cells without introducing randomness.
            threshold_shift = (fixed_score(x, y) - 0.5) * 18.0
            if brightness + threshold_shift >= 184:
                color = C3_LIGHT_BLUE
            elif brightness + threshold_shift >= 112:
                color = C3_PRIMARY_BLUE
            else:
                color = C3_ACCENT_BLUE
            pixels[x, y] = color

    layer = low_layer.resize(gray.size, Image.Resampling.NEAREST)
    result = Image.new("RGB", gray.size, BACKGROUND)
    # Preserve the original hand mask: no internal edge deletion in C3.
    result.paste(layer, mask=mask)

    # Add a very low-density, fixed raster transition only outside 2–6 px.
    hard = mask.point(lambda value: 255 if value >= 52 else 0)
    ring_2 = hard.filter(ImageFilter.MaxFilter(5))
    ring_4 = hard.filter(ImageFilter.MaxFilter(9))
    ring_6 = hard.filter(ImageFilter.MaxFilter(13))
    hard_data = hard.get_flattened_data()
    ring_2_data = ring_2.get_flattened_data()
    ring_4_data = ring_4.get_flattened_data()
    ring_6_data = ring_6.get_flattened_data()
    result_pixels = result.load()
    for y in range(height):
        for x in range(width):
            index = y * width + x
            if hard_data[index] or not ring_6_data[index]:
                continue
            if ring_2_data[index]:
                density = 0.06
            elif ring_4_data[index]:
                density = 0.025
            else:
                density = 0.008
            if fixed_score(x, y) < density:
                result_pixels[x, y] = C3_LIGHT_BLUE

    return result, actual_coverage


def c4_from_existing_c(
    base_c: Image.Image,
    gray: Image.Image,
    mask: Image.Image,
) -> Image.Image:
    """Lightly recolor C's existing marks and add a sparse outer raster edge."""
    base = base_c.convert("RGB")
    if base.size != gray.size:
        raise ValueError("The existing C image and raw frame must have the same size")

    # Recreate C's glyph alpha only as a protection mask. Its character choices,
    # grid, size, density, and placement remain byte-for-byte deterministic.
    ascii_protection = ascii_layer(
        gray,
        mask,
        ink_color=C_ASCII_BLUE,
        **C2_ASCII_SETTINGS,
    ).getchannel("A")

    base_pixels = list(base.get_flattened_data())
    gray_pixels = gray.get_flattened_data()
    protection_pixels = ascii_protection.get_flattened_data()
    output_pixels = base_pixels.copy()

    for index, (pixel, brightness, protected) in enumerate(
        zip(base_pixels, gray_pixels, protection_pixels)
    ):
        red, green, blue = pixel
        is_blue_raster = blue > red + 25 and blue > green + 8
        if not is_blue_raster or protected > 0:
            continue

        if brightness >= 184:
            target = C4_HIGHLIGHT_BLUE
        elif brightness >= 112:
            target = C4_MIDTONE_BLUE
        else:
            target = C4_SHADOW_BLUE

        # Retain C's existing antialias strength at silhouettes and glyph edges.
        distance = max(
            abs(red - BACKGROUND[0]),
            abs(green - BACKGROUND[1]),
            abs(blue - BACKGROUND[2]),
        )
        alpha = min(1.0, distance / 118.0)
        output_pixels[index] = tuple(
            round(paper * (1.0 - alpha) + ink * alpha)
            for paper, ink in zip(BACKGROUND, target)
        )

    result = Image.new("RGB", base.size)
    result.putdata(output_pixels)

    # Preserve the full C silhouette. Only add a handful of fixed 2 px raster
    # dots in the outermost 3–6 px; no internal erosion is performed.
    width, height = mask.size
    hard = mask.point(lambda value: 255 if value >= 52 else 0)
    ring_3 = hard.filter(ImageFilter.MaxFilter(7))
    ring_6 = hard.filter(ImageFilter.MaxFilter(13))
    hard_data = hard.get_flattened_data()
    ring_3_data = ring_3.get_flattened_data()
    ring_6_data = ring_6.get_flattened_data()
    result_data = list(result.get_flattened_data())

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if hard_data[index] or not ring_6_data[index]:
                continue
            density = 0.022 if ring_3_data[index] else 0.007
            if fixed_score(x // 2, y // 2) < density:
                result_data[index] = C4_HIGHLIGHT_BLUE

    result.putdata(result_data)
    return result


def fixed_score(column: int, row: int) -> float:
    """Deterministic 0..1 score; identical cells behave identically every run."""
    value = (column * 73856093) ^ (row * 19349663) ^ 0x5F3759DF
    return (value & 0xFFFF) / 65535.0


def choose_token(brightness: int, column: int, row: int) -> str:
    """Choose only from ·, +, ×, #, and 01 according to local luminance."""
    phase = (column * 3 + row * 5) % 2
    if brightness < 62:
        return "#" if phase == 0 else "01"
    if brightness < 118:
        return "×" if phase == 0 else "#"
    if brightness < 178:
        return "+" if phase == 0 else "×"
    if brightness < 224:
        return "·" if phase == 0 else "+"
    return "·"


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/lucon.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
        Path("/System/Library/Fonts/Menlo.ttc"),
    )
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def ascii_layer(
    gray: Image.Image,
    mask: Image.Image,
    *,
    cell: int,
    density: float,
    font_ratio: float,
    ink_color: tuple[int, int, int] = SECONDARY_BLUE,
    output_size: tuple[int, int] | None = None,
) -> Image.Image:
    # `gray` and `mask` define the original design grid. Glyphs are positioned
    # and rasterized directly on `output_size`; the completed ASCII layer is
    # never resized or filtered afterward.
    width, height = gray.size
    final_width, final_height = output_size or gray.size
    scale_x = final_width / width
    scale_y = final_height / height
    layer = Image.new("RGBA", (final_width, final_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = find_font(max(8, round(cell * font_ratio * scale_y)))

    # Fixed grid origin (0, 0). Only a cell's source brightness and fixed hash
    # affect whether/which character is placed.
    for row, y in enumerate(range(0, height, cell)):
        for column, x in enumerate(range(0, width, cell)):
            cx = min(width - 1, x + cell // 2)
            cy = min(height - 1, y + cell // 2)
            coverage = mask.getpixel((cx, cy)) / 255.0
            if coverage < 0.30:
                continue

            brightness = gray.getpixel((cx, cy))
            darkness = 1.0 - brightness / 255.0
            probability = density * (0.68 + 0.55 * darkness) * coverage
            if fixed_score(column, row) > min(1.0, probability):
                continue

            token = choose_token(brightness, column, row)
            bbox = draw.textbbox((0, 0), token, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            final_x = round(x * scale_x)
            final_y = round(y * scale_y)
            final_cell_width = round(min(width, x + cell) * scale_x) - final_x
            final_cell_height = round(min(height, y + cell) * scale_y) - final_y
            tx = final_x + (final_cell_width - text_width) / 2 - bbox[0]
            ty = final_y + (final_cell_height - text_height) / 2 - bbox[1]
            # Dark regions use warm-white knockout type; highlights use deep
            # blue. This keeps the limited palette while making glyphs legible.
            color = BACKGROUND if brightness < 142 else ink_color
            alpha = round(220 + 35 * darkness)
            draw.text((tx, ty), token, font=font, fill=(*color, alpha))

    # Clip every glyph to the hand; background remains completely clean.
    layer_alpha = layer.getchannel("A")
    final_mask = (
        mask
        if mask.size == (final_width, final_height)
        else mask.resize((final_width, final_height), Image.Resampling.LANCZOS)
    )
    layer.putalpha(ImageChops.multiply(layer_alpha, final_mask))
    return layer


def stylize(
    image: Image.Image,
    variant: str,
    base_c: Image.Image | None = None,
    output_size: tuple[int, int] | None = None,
) -> tuple[Image.Image, float]:
    # C3 keeps the source frame as its design coordinate system. Its dither is
    # enlarged first, while ASCII is rendered only after the final canvas size
    # has been reached. Other studies retain their historical behavior.
    if variant != "C3" and output_size and image.size != output_size:
        image = image.resize(output_size, Image.Resampling.LANCZOS)

    rgb = image.convert("RGB")
    source_background = sample_background(rgb)
    mask = make_hand_mask(rgb, source_background)
    gray = enhanced_grayscale(rgb, mask)

    if variant == "C4":
        if base_c is None:
            raise ValueError("C4 requires the corresponding existing C image")
        result = c4_from_existing_c(base_c, gray, mask)
        # ASCII is already present and deliberately untouched in the C bitmap.
        return result, 0.0
    if variant == "C3":
        result, actual_coverage = c3_dither_layer(gray, mask)
        final_size = output_size or result.size
        if result.size != final_size:
            # Preserve the approved coarse C3 raster structure exactly.
            result = result.resize(final_size, Image.Resampling.NEAREST)
        # Reuse C2's exact deterministic ASCII clipping shape so its glyph
        # positions remain unchanged; this mask does not affect the C3 hand.
        c2_ascii_shape = fragmented_edge_mask(mask)
        characters = ascii_layer(
            gray,
            c2_ascii_shape,
            ink_color=C_ASCII_BLUE,
            output_size=final_size,
            **C2_ASCII_SETTINGS,
        )
    elif variant == "C2":
        result, edge_shape = c2_dither_layer(gray, mask)
        characters = ascii_layer(
            gray,
            edge_shape,
            ink_color=C2_ACCENT_BLUE,
            **C2_ASCII_SETTINGS,
        )
        actual_coverage = 0.0
    else:
        result, coarse_shape, actual_coverage = coarse_dither_layer(
            gray, mask, VARIANTS[variant]
        )
        characters = ascii_layer(gray, coarse_shape, **ASCII_SETTINGS)
    final = Image.alpha_composite(result.convert("RGBA"), characters).convert("RGB")
    return final, actual_coverage


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "inputs",
        nargs="*",
        type=Path,
        default=list(DEFAULT_INPUTS),
        help="Input PNG files (defaults to hand_01, hand_10, hand_20)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--variants",
        nargs="+",
        choices=(*VARIANTS.keys(), "C2", "C3", "C4"),
        default=["C4"],
        help="Variants to render (default: C4)",
    )
    parser.add_argument(
        "--output-format",
        choices=("png", "webp"),
        default="png",
        help="Output image format (default: png)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=90,
        help="WebP quality from 0 to 100 (default: 90)",
    )
    parser.add_argument(
        "--lossless",
        action="store_true",
        help="Use lossless WebP encoding (only with --output-format webp)",
    )
    parser.add_argument(
        "--omit-variant-suffix",
        action="store_true",
        help="Write hand_01.webp instead of hand_01_C3.webp",
    )
    parser.add_argument(
        "--resize",
        metavar="WIDTHxHEIGHT",
        help="Set final output size, for example 1920x1080",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.quality <= 100:
        raise SystemExit("--quality must be between 0 and 100")
    if args.lossless and args.output_format != "webp":
        raise SystemExit("--lossless can only be used with --output-format webp")
    missing = [path for path in args.inputs if not path.is_file()]
    if missing:
        raise SystemExit("Missing input file(s): " + ", ".join(map(str, missing)))
    resize_to = None
    if args.resize:
        try:
            resize_width, resize_height = (int(part) for part in args.resize.lower().split("x", 1))
        except ValueError as exc:
            raise SystemExit("--resize must use WIDTHxHEIGHT, for example 1600x900") from exc
        if resize_width <= 0 or resize_height <= 0:
            raise SystemExit("--resize dimensions must be positive")
        resize_to = (resize_width, resize_height)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for input_path in args.inputs:
        with Image.open(input_path) as source:
            for variant in args.variants:
                suffix = "" if args.omit_variant_suffix else f"_{variant}"
                output_path = args.output_dir / (
                    f"{input_path.stem}{suffix}.{args.output_format}"
                )
                if variant == "C4":
                    c_path = args.output_dir / f"{input_path.stem}_C.png"
                    if not c_path.is_file():
                        raise SystemExit(f"Missing C source image: {c_path}")
                    with Image.open(c_path) as c_source:
                        result, coverage = stylize(
                            source, variant, c_source, output_size=resize_to
                        )
                else:
                    result, coverage = stylize(
                        source, variant, output_size=resize_to
                    )
                if args.output_format == "webp":
                    result.save(
                        output_path,
                        "WEBP",
                        quality=args.quality,
                        lossless=args.lossless,
                        method=6,
                    )
                else:
                    result.save(output_path, "PNG", optimize=True)
                if variant in {"C2", "C3", "C4"}:
                    print(output_path)
                else:
                    print(f"{output_path}  coarse-blue={coverage:.1%}")


if __name__ == "__main__":
    main()
