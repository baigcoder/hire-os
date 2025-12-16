/**
 * Optimized Image Component
 * Features: Lazy loading, WebP support, blur placeholder, responsive sizes
 */

import React, { useState, useRef, useEffect, memo } from 'react';

/**
 * OptimizedImage - Lazy loading image with WebP and blur-up
 */
export const OptimizedImage = memo(({
    src,
    alt,
    className = '',
    width,
    height,
    priority = false, // If true, loads immediately
    placeholder = 'blur', // 'blur' | 'empty' | 'skeleton'
    blurDataUrl = null, // Base64 blur placeholder
    quality = 80,
    onLoad = () => { },
    onError = () => { },
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const [error, setError] = useState(false);
    const imgRef = useRef(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || !imgRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport
                threshold: 0.01
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, [priority]);

    // Generate Cloudinary optimized URL
    const getOptimizedUrl = (originalUrl) => {
        if (!originalUrl) return '';

        // If already a Cloudinary URL, add transformations
        if (originalUrl.includes('cloudinary.com') || originalUrl.includes('res.cloudinary')) {
            // Insert transformations before the version/filename
            const parts = originalUrl.split('/upload/');
            if (parts.length === 2) {
                const transforms = `f_auto,q_${quality}`;
                return `${parts[0]}/upload/${transforms}/${parts[1]}`;
            }
        }

        return originalUrl;
    };

    const handleLoad = (e) => {
        setIsLoaded(true);
        onLoad(e);
    };

    const handleError = (e) => {
        setError(true);
        onError(e);
    };

    // Placeholder styles
    const getPlaceholderStyle = () => {
        if (placeholder === 'blur' && blurDataUrl) {
            return {
                backgroundImage: `url(${blurDataUrl})`,
                backgroundSize: 'cover',
                filter: 'blur(10px)',
                transform: 'scale(1.1)'
            };
        }
        if (placeholder === 'skeleton') {
            return {
                background: 'linear-gradient(90deg, #27272a 25%, #3f3f46 50%, #27272a 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
            };
        }
        return {};
    };

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${className}`}
            style={{
                width: width ? `${width}px` : '100%',
                height: height ? `${height}px` : 'auto',
                aspectRatio: width && height ? `${width}/${height}` : undefined
            }}
        >
            {/* Placeholder */}
            {!isLoaded && !error && (
                <div
                    className="absolute inset-0 bg-zinc-800"
                    style={getPlaceholderStyle()}
                />
            )}

            {/* Actual image */}
            {isInView && !error && (
                <img
                    src={getOptimizedUrl(src)}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
                        w-full h-full object-cover
                        transition-opacity duration-300
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    {...props}
                />
            )}

            {/* Error fallback */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-500">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
});

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Avatar with optimized loading
 */
export const OptimizedAvatar = memo(({
    src,
    alt,
    size = 40,
    fallback,
    className = '',
    ...props
}) => {
    const [error, setError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const initials = fallback || alt?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

    return (
        <div
            className={`relative rounded-full overflow-hidden bg-amber-400/20 flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            {...props}
        >
            {/* Fallback initials */}
            {(!src || error) && (
                <span className="text-amber-400 font-medium" style={{ fontSize: size * 0.4 }}>
                    {initials}
                </span>
            )}

            {/* Avatar image */}
            {src && !error && (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setError(true)}
                    className={`
                        absolute inset-0 w-full h-full object-cover
                        transition-opacity duration-200
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                />
            )}
        </div>
    );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

/**
 * Background image with lazy loading
 */
export const LazyBackground = memo(({
    src,
    children,
    className = '',
    overlayOpacity = 0.5,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isInView || !src) return;

        const img = new Image();
        img.onload = () => setIsLoaded(true);
        img.src = src;
    }, [isInView, src]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
            {...props}
        >
            {/* Background image */}
            {isLoaded && (
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
                    style={{
                        backgroundImage: `url(${src})`,
                        opacity: isLoaded ? 1 : 0
                    }}
                />
            )}

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black"
                style={{ opacity: overlayOpacity }}
            />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
});

LazyBackground.displayName = 'LazyBackground';

// CSS for shimmer animation (add to your global CSS)
export const shimmerCSS = `
@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
`;

export default {
    OptimizedImage,
    OptimizedAvatar,
    LazyBackground,
    shimmerCSS
};
