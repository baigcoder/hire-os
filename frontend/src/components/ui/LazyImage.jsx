import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * LazyImage - Performance-optimized image component
 * Features:
 * - Intersection Observer for viewport detection (lazy loading)
 * - Skeleton placeholder while loading
 * - WebP support with fallback
 * - Error state handling
 * - Blur-up loading effect
 */
const LazyImage = ({
    src,
    alt,
    className,
    containerClassName,
    width,
    height,
    placeholderColor = "#1a1a1a",
    blurHash,
    priority = false, // Set to true for above-the-fold images
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    // Use Intersection Observer for lazy loading
    useEffect(() => {
        if (priority || isInView) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: "50px", // Start loading 50px before entering viewport
                threshold: 0.01,
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [priority, isInView]);

    // Handle image load
    const handleLoad = (e) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    // Handle image error
    const handleError = (e) => {
        setHasError(true);
        onError?.(e);
    };

    // Generate WebP URL if using Cloudinary
    const getOptimizedSrc = (url) => {
        if (!url) return url;

        // If it's a Cloudinary URL, optimize it
        if (url.includes("cloudinary.com")) {
            // Add quality and format auto for Cloudinary
            const parts = url.split("/upload/");
            if (parts.length === 2) {
                return `${parts[0]}/upload/f_auto,q_auto,w_${width || 800}/${parts[1]}`;
            }
        }

        return url;
    };

    const optimizedSrc = getOptimizedSrc(src);

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative overflow-hidden bg-neutral-900",
                containerClassName
            )}
            style={{
                width: width ? `${width}px` : "100%",
                height: height ? `${height}px` : "auto",
                aspectRatio: width && height ? `${width}/${height}` : undefined,
            }}
        >
            {/* Skeleton placeholder */}
            {!isLoaded && !hasError && (
                <div
                    className="absolute inset-0 animate-pulse"
                    style={{ backgroundColor: placeholderColor }}
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                </div>
            )}

            {/* Error state */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                    <div className="text-center text-neutral-500">
                        <svg
                            className="w-8 h-8 mx-auto mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <span className="text-xs">Image unavailable</span>
                    </div>
                </div>
            )}

            {/* Actual image - render only when in viewport */}
            {isInView && !hasError && (
                <img
                    ref={imgRef}
                    src={optimizedSrc}
                    alt={alt}
                    className={cn(
                        "transition-opacity duration-500",
                        isLoaded ? "opacity-100" : "opacity-0",
                        className
                    )}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading={priority ? "eager" : "lazy"}
                    decoding="async"
                    {...props}
                />
            )}
        </div>
    );
};

/**
 * LazyAvatar - Optimized avatar component with fallback
 */
export const LazyAvatar = ({
    src,
    alt,
    size = 40,
    className,
    fallbackInitials,
    ...props
}) => {
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Generate initials from alt text or fallback
    const initials = fallbackInitials || alt?.charAt(0).toUpperCase() || "?";

    if (hasError || !src) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-green-500/20 text-white font-semibold",
                    className
                )}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {initials}
            </div>
        );
    }

    return (
        <div
            className={cn("relative rounded-full overflow-hidden bg-neutral-800", className)}
            style={{ width: size, height: size }}
        >
            {!isLoaded && (
                <div className="absolute inset-0 animate-pulse bg-neutral-700" />
            )}
            <img
                src={src}
                alt={alt}
                className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                loading="lazy"
                decoding="async"
                {...props}
            />
        </div>
    );
};

export default LazyImage;

// Add shimmer animation to global CSS or tailwind config if not already present
// @keyframes shimmer { to { transform: translateX(100%); } }
