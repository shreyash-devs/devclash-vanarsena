import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import FOG from 'vanta/dist/vanta.fog.min';

const VantaFogBackground: React.FC = () => {
    const vantaRef = useRef<HTMLDivElement>(null);
    const [vantaEffect, setVantaEffect] = useState<any>(null);

    useEffect(() => {
        if (!vantaEffect && vantaRef.current) {
            // Vanta assumes THREE is global sometimes
            (window as any).THREE = THREE;
            
            // Safety check for ESM/CJS interop
            const vantaFunction = (FOG as any).default || FOG;
            
            if (typeof vantaFunction === 'function') {
                setVantaEffect(
                    vantaFunction({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.0,
                    minWidth: 200.0,
                    highlightColor: 0x5f13cf,
                    midtoneColor: 0xaa9abd,
                    lowlightColor: 0x15007e,
                    baseColor: 0x32045e,
                    blurFactor: 0.6,
                    speed: 1.0,
                    zoom: 0.5,
                })
            );
        }
    }
    return () => {
        if (vantaEffect) vantaEffect.destroy();
    };
}, [vantaEffect]);

    return (
        <div 
            ref={vantaRef} 
            className="fixed inset-0 z-0 pointer-events-none" 
            style={{ height: '100vh', width: '100vw' }} 
        />
    );
};

export default VantaFogBackground;
