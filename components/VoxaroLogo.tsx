interface Props {
  size?: 'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: { icon: 20, text: 'text-lg' },
  md: { icon: 28, text: 'text-2xl' },
  lg: { icon: 40, text: 'text-4xl' },
}

export default function VoxaroLogo({ size = 'md' }: Props) {
  const { icon, text } = SIZE[size]

  return (
    <div className="flex items-center gap-2">
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 2L4.5 13.5H11L9 22L19.5 10H13L13 2Z"
          fill="#FF6B00"
        />
      </svg>
      <span className={`${text} font-black tracking-wider leading-none`}>
        <span style={{ color: '#FF6B00' }}>VOX</span>
        <span className="text-white">ARO</span>
      </span>
    </div>
  )
}
