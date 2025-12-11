import React, { useEffect, useRef } from 'react';

const CustomCursor: React.FC = () => {
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            if (cursorRef.current) {
                // translate3d for hardware acceleration
                cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            }
        };

        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, []);

    return (
        <div 
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[100] mix-blend-normal"
            style={{ willChange: 'transform' }}
        >
             {/* Main Arrow Body */}
             <svg 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
             >
                <path 
                    d="M2 2L9.5 21L12.5 13L20.5 10L2 2Z" 
                    fill="#eab308" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeLinejoin="round"
                />
             </svg>
        </div>
    );
};

export default CustomCursor;