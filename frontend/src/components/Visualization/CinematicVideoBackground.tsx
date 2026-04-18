import React from 'react';

const CinematicVideoBackground: React.FC = () => {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-black">
            {/* The Video Layer */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-80"
            >
                <source src="/background.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Neural Vignette Overlay — Darkens edges for text legibility */}
            <div 
                className="absolute inset-0 z-10" 
                style={{
                    background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%), linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.8) 100%)'
                }}
            />
        </div>
    );
};

export default CinematicVideoBackground;
