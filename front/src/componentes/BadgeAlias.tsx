import { motion } from 'framer-motion';
import { useState } from 'react';

interface PropsBadgeAlias {
  alias: string;
}

export default function BadgeAlias({ alias }: PropsBadgeAlias) {
  const [copiado, setCopiado] = useState(false);

  async function copiarAlias() {
    await navigator.clipboard.writeText(alias);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={copiarAlias}
      className="glass-card flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition hover:border-pollo-neon/40"
      title="Copiar alias"
    >
      <span className="text-white/40">Alias:</span>
      <span className="font-medium text-pollo-verde">{alias}</span>
      <span className="text-xs">{copiado ? '✅' : '📋'}</span>
    </motion.button>
  );
}
