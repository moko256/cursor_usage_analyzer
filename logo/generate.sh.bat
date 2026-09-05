mkdir out
magick logo.svg -crop 256x256+128+128 -resize 16x16 +dither -remap pallet.png "out/favicon.ico"
magick logo.svg -crop 256x256+128+128 -resize 180x180 +dither -remap pallet.png "out/apple-touch-icon.png"
magick logo.svg -crop 256x256+128+128 -resize 192x192 +dither -remap pallet.png "out/icon-192.png"
magick logo.svg -resize 512x512 +dither -remap pallet.png "out/icon-512-mask.png"
magick logo.svg -crop 256x256+128+128 -resize 512x512 +dither -remap pallet.png "out/icon-512.png"
