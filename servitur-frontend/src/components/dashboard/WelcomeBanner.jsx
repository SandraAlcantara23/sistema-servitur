import busHero from '../../assets/bus-hero.png'

export default function WelcomeBanner({ userName = 'Sandra' }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-servitur-azul-oscuro h-48 md:h-64">
      <img
        src={busHero}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-[center_65%] opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-servitur-azul-oscuro/95 via-servitur-azul-oscuro/60 to-servitur-azul-oscuro/10" />

      <div className="relative h-full flex flex-col justify-center px-6 md:px-10 max-w-lg">
        <h1 className="text-white text-2xl md:text-3xl font-semibold">Bienvenida, {userName}</h1>
        <p className="text-white/85 mt-1">Aquí tienes un resumen de la operación de hoy.</p>
      </div>
    </div>
  )
}
