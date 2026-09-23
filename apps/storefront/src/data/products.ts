import { Product, Testimonial, FAQItem } from '../types';

export const FLAGSHIP_PROTEIN: Product = {
  id: 'kinetic-gold-standard-whey',
  name: 'GOLD STANDARD 100% WHEY',
  subtitle: 'Proteína aislada de suero de leche #1 mundial para máxima recuperación y ganancia muscular',
  category: 'Proteínas',
  description: 'La proteína de referencia para atletas comprometidos: 24g de proteína de suero pura con aislado como fuente primaria, 5.5g de BCAAs y sabor inigualable.',
  longDescription: 'Diseñada con aislado de proteína de suero (WPI) de microfiltración instantánea para máxima biodisponibilidad y digestibilidad óptima. Con certificado Informed Choice de sustancias prohibidas.',
  price: 54990,
  originalPrice: 68990,
  badge: 'OFERTA ESPECIAL',
  rating: 4.9,
  image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=500&q=75',
  flavors: [
    { id: 'choco', name: 'Double Rich Chocolate', color: 'bg-red-600', accentHex: '#dc2626', badge: 'MÁS POPULAR' },
    { id: 'vanilla', name: 'Vanilla Ice Cream', color: 'bg-amber-100', accentHex: '#f59e0b' },
    { id: 'cookies', name: 'Cookies & Cream', color: 'bg-neutral-800', accentHex: '#3b82f6' },
    { id: 'strawberry', name: 'Delicious Strawberry', color: 'bg-rose-600', accentHex: '#e11d48' }
  ],
  sizes: [
    {
      id: '310g',
      name: '310 gr',
      weight: '10.9 OZ (310 G)',
      servings: 10,
      price: 32990,
      originalPrice: 34990
    },
    {
      id: '2lb',
      name: '2 Libras',
      weight: '2 LB (907 G)',
      servings: 29,
      price: 65990,
      originalPrice: 65990
    },
    {
      id: '5lb',
      name: '5 Libras',
      weight: '5 LB (2.27 KG)',
      servings: 74,
      price: 106990,
      originalPrice: 107990
    }
  ],
  features: [
    '24g de proteína pura por porción (WPI como fuente primaria)',
    '5.5g de BCAAs naturales para recuperación y resistencia',
    'Más de 4g de Glutamina y Ácido Glutámico natural',
    'Probada contra sustancias prohibidas (Informed Choice)',
    'Disolución instantánea usando solo una cuchara o shaker',
    'Menos de 1.5g de grasa y solo 120 calorías por dosis'
  ],
  nutritionFacts: [
    { label: 'Proteína por Porción', value: '24g', highlight: true },
    { label: 'BCAAs Naturales', value: '5.5g', highlight: true },
    { label: 'Aislado de Suero (WPI)', value: 'Fuente Primaria', highlight: true },
    { label: 'Carbohidratos Netos', value: '3g' },
    { label: 'Grasas Totales', value: '1.5g' },
    { label: 'Calorías por Servicio', value: '120 kcal' },
    { label: 'Tamaño de Porción', value: '30.4g (1 Scoop)' },
    { label: 'Porciones por Envase', value: '74 Porciones (5 LB)' }
  ]
};

export const FEATURED_PRODUCTS: Product[] = [
  {
    id: 'kinetic-creatine-pure',
    name: 'CREATINA CREAPURE®',
    subtitle: '100% Monohidrato Micronizado 200 Mesh',
    category: 'Rendimiento',
    description: 'La creatina de mayor pureza para maximizar tu fuerza explosiva y volumen muscular.',
    longDescription: 'Sello de pureza Creapure® fabricado bajo los estándares de control más rigurosos. Favorece la resíntesis de ATP celular durante series intensas.',
    price: 26990,
    originalPrice: 31990,
    badge: 'TOP VENTAS',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=500&q=75',
    features: ['5g de creatina Creapure® pura', 'Micronizado ultra fino 200 Mesh', 'Sin sabor, ideal para mezclar', '60 porciones']
  },
  {
    id: 'kinetic-preworkout-surge',
    name: 'PRE-WORKOUT NITRO SURGE',
    subtitle: 'Foco mental extremo y bombeo muscular vascular',
    category: 'Energía',
    description: 'Fórmula de activación neuromuscular con Beta-Alanina, Citrulina Malato y Cafeína anhidra.',
    longDescription: 'Diseñado para entrenamientos donde necesitas superar tus marcas personales sin sufrir choques de fatiga posteriores.',
    price: 34990,
    originalPrice: 42990,
    badge: 'NUEVA FÓRMULA',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=500&q=75',
    flavors: [
      { id: 'blue-ice', name: 'Blue Raspberry Ice', color: 'bg-cyan-900', accentHex: '#06b6d4' },
      { id: 'sour-apple', name: 'Manzana Ácida Eléctrica', color: 'bg-lime-900', accentHex: '#84cc16' }
    ],
    features: ['6000mg L-Citrulina Malato', '3200mg CarnoSyn® Beta-Alanina', '300mg Cafeína Anhidra', '30 Servicios']
  },
  {
    id: 'kinetic-shaker-steel',
    name: 'SHAKER PRO BLACK STEEL',
    subtitle: 'Acero inoxidable 18/8 con aislamiento térmico',
    category: 'Accesorios',
    description: 'Mantén tus batidos helados hasta por 18 horas con cierre antifugas hermético.',
    longDescription: 'Fabricado en acero de grado alimenticio sin BPA, resistente a olores y caídas. Rejilla silenciosa de disolución rápida.',
    price: 18990,
    originalPrice: 24990,
    badge: 'INDISPENSABLE',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=500&q=75',
    features: ['750ml de capacidad', 'Doble pared térmica al vacío', 'Libre de BPA y olores', 'Boquilla con cierre seguro']
  },
  {
    id: 'kinetic-protein-bars',
    name: 'CRUNCH PROTEIN BARS (12x)',
    subtitle: 'Caja de 12 barritas con 21g de proteína y menos de 1g de azúcar',
    category: 'Snacks',
    description: 'Textura crujiente gourmet para tus colaciones entre comidas o meriendas deportivas.',
    longDescription: 'Capas de crocante proteico recubiertas en chocolate belga sin azúcar añadida y fibra prebiótica saciante.',
    price: 24990,
    originalPrice: 29990,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1622484216805-f932822a967f?auto=format&fit=crop&w=500&q=75',
    flavors: [
      { id: 'caramel', name: 'Caramelo Salado Crunch', color: 'bg-amber-900', accentHex: '#b45309' },
      { id: 'dark-choco', name: 'Chocolate Negro 70%', color: 'bg-neutral-900', accentHex: '#404040' }
    ],
    features: ['21g de proteína por barra', 'Menos de 1.5g de azúcares', 'Ricas en fibra prebiótica', '12 unidades por caja']
  },
  {
    id: 'kinetic-lifting-straps',
    name: 'HEAVY DUTY LIFTING STRAPS',
    subtitle: 'Correas de levantamiento de alta resistencia con acolchado de neopreno',
    category: 'Accesorios',
    description: 'Asegura tu agarre en peso muerto, remos y dominadas sin fatiga en los antebrazos.',
    longDescription: 'Algodón industrial reforzado con costuras dobles de kevlar y almohadilla de neopreno grueso para evitar rozaduras.',
    price: 14990,
    originalPrice: 19990,
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=75',
    features: ['Algodón resistente de 60cm', 'Acolchado de neopreno de 5mm', 'Costuras reforzadas', 'Talla única universal']
  },
  {
    id: 'kinetic-performance-tee',
    name: 'KINETIC PERFORMANCE TEE',
    subtitle: 'Remera técnica transpirable de corte atlético',
    category: 'Ropa',
    description: 'Tejido técnico microperforado de secado ultra rápido para entrenamientos de máxima intensidad.',
    longDescription: 'Confección elástica en 4 direcciones que acompaña cada movimiento sin restringir hombros ni espalda.',
    price: 22990,
    originalPrice: 28990,
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=500&q=75',
    features: ['Tejido Dry-Performance 4-way stretch', 'Tratamiento anti-olor permanente', 'Detalles reflectantes de alta visibilidad', 'Tallas S a XXL']
  }
];

export const BENEFITS = [
  {
    id: 'protein',
    icon: 'Dumbbell',
    title: 'ALTO CONTENIDO DE PROTEÍNA',
    stat: '24g',
    statLabel: 'por servicio',
    description: 'Aislado de suero de leche obtenido mediante ultrafiltración CFM para asegurar la máxima pureza sin desnaturalizar los aminoácidos esenciales.'
  },
  {
    id: 'performance',
    icon: 'Zap',
    title: 'APOYO AL RENDIMIENTO',
    stat: '5.5g',
    statLabel: 'BCAAs naturales',
    description: 'Perfil de aminoácidos con alta concentración de Leucina que estimula la ruta mTOR y promueve el anabolismo muscular en cada sesión.'
  },
  {
    id: 'recovery',
    icon: 'RotateCcw',
    title: 'RECUPERACIÓN POST-ENTRENAMIENTO',
    stat: '< 20min',
    statLabel: 'tiempo de asimilación',
    description: 'La absorción acelerada suministra nutrientes inmediatamente al torrente sanguíneo para reparar micro-roturas musculares tras el esfuerzo.'
  },
  {
    id: 'taste',
    icon: 'Sparkles',
    title: 'GRAN SABOR Y FÁCIL PREPARACIÓN',
    stat: '100%',
    statLabel: 'disolución instantánea',
    description: 'Microencapsulada para mezclarse en segundos en agua fría o leche vegetal sin batidora ni grumos, con sabores gourmet equilibrados.'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: '1',
    name: 'Matías Silva',
    role: 'Atleta de Fuerza & Crossfit',
    comment: 'Excelente sabor y muy fácil de preparar. Se disuelve en segundos en el shaker sin dejar absolutamente ningún grumo.',
    rating: 5,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=75',
    productPurchased: 'KINETIC ISO-WHEY PRO (Doble Chocolate)'
  },
  {
    id: '2',
    name: 'Valentina Morales',
    role: 'Corredora & Entrenadora Funcional',
    comment: 'Me gusta mucho para después de entrenar. La digestión es súper ligera, no genera pesadez y la recuperación al día siguiente es notable.',
    rating: 5,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=75',
    productPurchased: 'KINETIC ISO-WHEY PRO (Vainilla Bourbon)'
  },
  {
    id: '3',
    name: 'Rodrigo Araya',
    role: 'Practicante de Halterofilia',
    comment: 'La calidad de los ingredientes y el porcentaje de proteína real por servicio están en el estándar más alto. El shaker de acero inoxidable también es una joya.',
    rating: 5,
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=75',
    productPurchased: 'KINETIC ISO-WHEY PRO + Shaker Pro Steel'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: '¿Cómo se prepara?',
    answer: 'Mezcla 1 scoop (aproximadamente 30 gramos) en 250 a 300 ml de agua fría, leche descremada o tu bebida vegetal favorita. Agita vigorosamente en tu shaker durante 10 a 15 segundos. Su formulación microfiltrada se disuelve al instante sin requerir licuadora.',
    category: 'Uso'
  },
  {
    question: '¿Cuántas porciones contiene?',
    answer: 'El envase Pro de 2.0 kg contiene 66 porciones completas de 30 gramos cada una. La presentación estándar de 900 gramos rinde 30 porciones.',
    category: 'Producto'
  },
  {
    question: '¿Qué sabores están disponibles?',
    answer: 'Actualmente disponemos de 4 perfiles de sabor premium: Doble Chocolate Suizo, Vainilla Bourbon Cream, Cookies & Cream Crunch y Frutilla Silvestre. Todos desarrollados sin azúcares añadidos.',
    category: 'Producto'
  },
  {
    question: '¿Cómo se realiza el envío?',
    answer: 'Realizamos envíos asegurados a todo el país mediante couriers de alta velocidad con seguimiento en tiempo real vía código de rastreo que recibes en tu correo electrónico y WhatsApp.',
    category: 'Envíos'
  },
  {
    question: '¿Cuánto demora el despacho?',
    answer: 'Los pedidos despachados en la Región Metropolitana llegan en 24 a 48 horas hábiles. Para regiones, el plazo habitual es de 48 a 72 horas hábiles.',
    category: 'Envíos'
  },
  {
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos Tarjetas de Crédito y Débito (Visa, Mastercard, American Express), Webpay Plus, Mercado Pago, transferencias bancarias directas y hasta 3 cuotas sin interés.',
    category: 'Pagos'
  }
];
