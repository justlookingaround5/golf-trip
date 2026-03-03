import sharp from 'sharp'

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#166534"/>
  <g transform="translate(140, 80)">
    <rect x="40" y="0" width="8" height="340" rx="4" fill="white"/>
    <path d="M48,20 L200,60 L200,140 L48,100 Z" fill="white" opacity="0.9"/>
    <ellipse cx="44" cy="360" rx="60" ry="12" fill="white" opacity="0.3"/>
  </g>
</svg>
`

async function generate() {
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile('public/icons/icon-512.png')
  await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icons/icon-192.png')
  console.log('Icons generated')
}

generate()
