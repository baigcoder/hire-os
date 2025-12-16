import { motion } from 'framer-motion';

// Industrial page transition variants
const pageVariants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};

// Fade transition for modals and overlays
const fadeVariants = {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Slide up for cards and panels
const slideUpVariants = {
    initial: { opacity: 0, y: 30 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

// Stagger container for lists
const staggerContainer = {
    initial: {},
    enter: {
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

// Stagger item
const staggerItem = {
    initial: { opacity: 0, y: 20 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Page transition wrapper component
export const PageTransition = ({ children, className = '' }) => (
    <motion.div
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className={className}
    >
        {children}
    </motion.div>
);

// Fade transition wrapper
export const FadeIn = ({ children, delay = 0, className = '' }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
        className={className}
    >
        {children}
    </motion.div>
);

// Slide up animation wrapper
export const SlideUp = ({ children, delay = 0, className = '' }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={className}
    >
        {children}
    </motion.div>
);

// Industrial card hover effect
export const HoverCard = ({ children, className = '' }) => (
    <motion.div
        whileHover={{ y: -2, borderColor: 'rgba(255, 215, 0, 0.3)' }}
        transition={{ duration: 0.2 }}
        className={className}
    >
        {children}
    </motion.div>
);

// Export all variants for use in components
export { pageVariants, fadeVariants, slideUpVariants, staggerContainer, staggerItem };
