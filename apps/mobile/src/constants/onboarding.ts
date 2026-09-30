export const ONBOARDING_SEEN_KEY = 'camina_onboarding_seen';

// Se muestra una sola vez, en la primera instalación (ver app/index.tsx).
export const ONBOARDING = [
  { icon: 'Logo', tone: 'mint', title: 'Camina y gana', desc: 'Cada paso te acerca a nuevas recompensas, beneficios y experiencias.' },
  {
    icon: 'Gift',
    tone: 'purple',
    title: 'Tus pasos tienen valor',
    desc: 'Caminá, acumulá Puntos y canjealos en comercios locales y marcas que te gustan.',
  },
  {
    icon: 'MapPin',
    tone: 'mint',
    title: 'Descubrí, explorá, disfrutá',
    desc: 'Eventos, beneficios, retos y mucho más. Todo en una sola app.',
  },
] as const;
