import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#09090b',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M13 2L4.5 13.5H11L9 22L19.5 10H13L13 2Z"
            fill="#f97316"
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
