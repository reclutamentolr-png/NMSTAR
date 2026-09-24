import Image from 'next/image'

// public/senza_sfondo.png è il medaglione "K" di Kumani con sfondo
// trasparente (669x373, non ritagliato a quadrato): con width=height=size e
// object-cover il crop centrale isola il cerchio dorato mantenendo un
// piccolo margine trasparente. Essendo trasparente va bene sia su sfondi
// chiari che scuri, senza bisogno di varianti diverse.
const SRC = '/senza_sfondo.png'

type LogoProps = {
  size?: number
  className?: string
  priority?: boolean
}

export default function Logo({ size = 40, className = '', priority = false }: LogoProps) {
  return (
    <Image
      src={SRC}
      alt="Kumani"
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-cover ${className}`}
    />
  )
}
