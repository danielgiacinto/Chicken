const EMOJIS = ['🐔', '🍗', '🥚', '🌽', '🪙'];

const POSICIONES = [
  { top: '8%', left: '5%', delay: '0s' },
  { top: '20%', right: '8%', delay: '1.5s' },
  { top: '55%', left: '3%', delay: '3s' },
  { top: '70%', right: '5%', delay: '0.8s' },
  { top: '40%', left: '85%', delay: '2.2s' },
  { top: '85%', left: '40%', delay: '4s' },
];

export default function FondoParticulas() {
  return (
    <div className="fondo-particulas" aria-hidden>
      {POSICIONES.map((pos, i) => (
        <span
          key={i}
          className="particula"
          style={{
            top: pos.top,
            left: pos.left,
            right: pos.right,
            animationDelay: pos.delay,
          }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </span>
      ))}
    </div>
  );
}
