import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, ArrowRight, Github } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GithubAuthProvider,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, githubProvider } from '../utils/firebase';
import toast from 'react-hot-toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: any, githubToken?: string) => void;
}

/* ── Floating-label input ── */
const FloatingInput = ({
    id, type = 'text', value, onChange, label, autoComplete, suffix,
}: {
    id: string; type?: string; value: string;
    onChange: (v: string) => void; label: string;
    autoComplete?: string; suffix?: React.ReactNode;
}) => {
    const [focused, setFocused] = useState(false);
    const active = focused || value.length > 0;

    return (
        <div style={{ position: 'relative' }}>
            {/* label */}
            <label
                htmlFor={id}
                style={{
                    position: 'absolute',
                    left: 16, top: active ? 8 : 18,
                    fontSize: active ? 10 : 14,
                    fontWeight: active ? 600 : 400,
                    color: focused ? '#a78bfa' : active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)',
                    letterSpacing: active ? '0.06em' : 0,
                    textTransform: active ? 'uppercase' as const : 'none' as const,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                    zIndex: 1,
                }}
            >
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoComplete={autoComplete}
                required
                style={{
                    width: '100%',
                    padding: active ? '24px 16px 10px' : '18px 16px',
                    paddingRight: suffix ? 48 : 16,
                    borderRadius: 12,
                    fontSize: 14,
                    color: '#fff',
                    background: focused ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${focused ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: focused ? '0 0 0 3px rgba(139,92,246,0.06), inset 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 2px rgba(0,0,0,0.05)',
                    outline: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />
            {suffix && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                    {suffix}
                </div>
            )}
        </div>
    );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) { toast.error('Authentication is not configured.'); return; }
        setIsLoading(true);
        try {
            let cred;
            if (isLogin) {
                cred = await signInWithEmailAndPassword(auth, email, password);
                toast.success('Welcome back!');
            } else {
                cred = await createUserWithEmailAndPassword(auth, email, password);
                toast.success('Account created!');
            }
            onLoginSuccess(cred.user);
            onClose();
        } catch (err: any) {
            toast.error(
                err.code === 'auth/invalid-credential' ? 'Invalid credentials. Try again.'
                    : err.code === 'auth/email-already-in-use' ? 'Email already registered.'
                        : err.message || 'Auth failed.'
            );
        } finally { setIsLoading(false); }
    };

    const handleProvider = async (provider: GoogleAuthProvider | GithubAuthProvider | null, name: string) => {
        if (!auth || !provider) { toast.error(`${name} auth not configured.`); return; }
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, provider);
            let ghToken: string | undefined;
            if (name === 'GitHub') {
                const c = GithubAuthProvider.credentialFromResult(result);
                if (c) ghToken = c.accessToken;
            }
            toast.success(`Signed in with ${name}`);
            onLoginSuccess(result.user, ghToken);
            onClose();
        } catch (err: any) { toast.error(err.message || `${name} auth failed.`); }
        finally { setIsLoading(false); }
    };

    const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
    const sColors = ['', '#ef4444', '#eab308', '#22c55e'];
    const sLabels = ['', 'Weak', 'Fair', 'Strong'];

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 flex items-center justify-center"
                style={{ zIndex: 9999, padding: 16 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* overlay */}
                <div className="absolute inset-0" onClick={onClose}
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }} />

                {/* stacked depth cards */}
                <motion.div
                    className="absolute"
                    style={{
                        width: '100%', maxWidth: 432, height: '92%', maxHeight: 620,
                        borderRadius: 20, background: 'rgba(139,92,246,0.06)',
                        border: '1px solid rgba(139,92,246,0.08)', zIndex: 8,
                        transform: 'rotate(2deg) translateY(8px)',
                    }}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                />
                <motion.div
                    className="absolute"
                    style={{
                        width: '100%', maxWidth: 438, height: '90%', maxHeight: 610,
                        borderRadius: 20, background: 'rgba(99,102,241,0.04)',
                        border: '1px solid rgba(99,102,241,0.06)', zIndex: 7,
                        transform: 'rotate(-1.5deg) translateY(14px)',
                    }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.02 }}
                />

                {/* main card */}
                <motion.div
                    initial={{ opacity: 0, y: 28, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 16, scale: 0.97 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    className="relative"
                    style={{ zIndex: 10, width: '100%', maxWidth: 430 }}
                >
                    <div style={{
                        borderRadius: 20, overflow: 'hidden',
                        background: '#0f0d1e',
                        border: '1px solid rgba(139,92,246,0.12)',
                        boxShadow: '0 28px 56px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.25)',
                    }}>
                        {/* ── Mesh gradient header ── */}
                        <div style={{
                            position: 'relative', height: 100, overflow: 'hidden',
                            background: 'linear-gradient(135deg, #1a1145 0%, #0f0d1e 50%, #15102e 100%)',
                        }}>
                            {/* animated mesh blobs */}
                            <motion.div
                                style={{
                                    position: 'absolute', width: 160, height: 160, borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
                                    filter: 'blur(30px)', left: -40, top: -60,
                                }}
                                animate={{ x: [0, 30, 0], y: [0, 15, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div
                                style={{
                                    position: 'absolute', width: 120, height: 120, borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
                                    filter: 'blur(25px)', right: -20, top: -30,
                                }}
                                animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                            />
                            <motion.div
                                style={{
                                    position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)',
                                    filter: 'blur(20px)', left: '40%', top: 10,
                                }}
                                animate={{ x: [0, 15, -15, 0], y: [0, -10, 5, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                            />
                            {/* fine grid overlay */}
                            <div style={{
                                position: 'absolute', inset: 0, opacity: 0.04,
                                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }} />
                            {/* bottom fade */}
                            <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                                background: 'linear-gradient(transparent, #0f0d1e)',
                            }} />

                            {/* close */}
                            <motion.button
                                onClick={onClose}
                                style={{
                                    position: 'absolute', top: 14, right: 14,
                                    padding: 7, borderRadius: 8,
                                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
                                    border: 'none', cursor: 'pointer', display: 'flex', zIndex: 2,
                                }}
                                whileHover={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                                whileTap={{ scale: 0.93 }}
                            >
                                <X size={14} />
                            </motion.button>
                        </div>

                        {/* ── Body ── */}
                        <div style={{ padding: '0 32px 32px' }}>
                            {/* Segmented toggle — pulled up into header area */}
                            <div style={{
                                display: 'flex', marginTop: -20,
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: 12, padding: 4,
                                border: '1px solid rgba(255,255,255,0.06)',
                                position: 'relative', zIndex: 3,
                            }}>
                                {/* sliding indicator */}
                                <motion.div
                                    layout
                                    style={{
                                        position: 'absolute', top: 4, bottom: 4,
                                        width: 'calc(50% - 4px)', borderRadius: 9,
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                                        border: '1px solid rgba(139,92,246,0.2)',
                                        boxShadow: '0 2px 8px rgba(99,102,241,0.1)',
                                    }}
                                    animate={{ left: isLogin ? 4 : 'calc(50%)' }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                />
                                <button
                                    onClick={() => setIsLogin(true)}
                                    style={{
                                        flex: 1, padding: '10px 0', borderRadius: 9,
                                        fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                                        background: 'transparent', position: 'relative', zIndex: 1,
                                        color: isLogin ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    style={{
                                        flex: 1, padding: '10px 0', borderRadius: 9,
                                        fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                                        background: 'transparent', position: 'relative', zIndex: 1,
                                        color: !isLogin ? '#c4b5fd' : 'rgba(255,255,255,0.3)',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* subtitle */}
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={isLogin ? 'sub-in' : 'sub-up'}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '20px 0 28px' }}
                                >
                                    {isLogin ? 'Sign in to continue to M/L Editor' : 'Create your free account to get started'}
                                </motion.p>
                            </AnimatePresence>

                            {/* Social row — at top for quick access */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                                <motion.button
                                    onClick={() => handleProvider(googleProvider, 'Google')}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 500,
                                        color: '#fff', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1.5px solid rgba(255,255,255,0.07)',
                                    }}
                                    whileHover={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.13)', y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google
                                </motion.button>
                                <motion.button
                                    onClick={() => handleProvider(githubProvider, 'GitHub')}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                        padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 500,
                                        color: '#fff', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1.5px solid rgba(255,255,255,0.07)',
                                    }}
                                    whileHover={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.13)', y: -1 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                >
                                    <Github size={16} />
                                    GitHub
                                </motion.button>
                            </div>

                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>or with email</span>
                                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                            </div>

                            {/* Form */}
                            <form onSubmit={handleEmailAuth}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <FloatingInput
                                        id="auth-email"
                                        type="email"
                                        value={email}
                                        onChange={setEmail}
                                        label="Email address"
                                        autoComplete="email"
                                    />

                                    <div>
                                        <FloatingInput
                                            id="auth-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={setPassword}
                                            label="Password"
                                            autoComplete={isLogin ? 'current-password' : 'new-password'}
                                            suffix={
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    style={{
                                                        padding: 4, background: 'none', border: 'none',
                                                        cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                                                        display: 'flex', transition: 'color 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                                                >
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            }
                                        />

                                        {/* strength bar */}
                                        <AnimatePresence>
                                            {!isLogin && password.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}
                                                >
                                                    <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                                                        {[1, 2, 3].map(l => (
                                                            <div key={l} style={{
                                                                height: 3, flex: 1, borderRadius: 2,
                                                                background: pwStrength >= l ? sColors[pwStrength] : 'rgba(255,255,255,0.05)',
                                                                transition: 'background 0.3s',
                                                            }} />
                                                        ))}
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 500, color: sColors[pwStrength], minWidth: 36 }}>
                                                        {sLabels[pwStrength]}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Submit */}
                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        width: '100%', marginTop: 24, padding: '14px 0', borderRadius: 12,
                                        fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                                        border: 'none',
                                        boxShadow: '0 4px 16px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
                                        opacity: isLoading ? 0.55 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                    whileHover={!isLoading ? { scale: 1.01, boxShadow: '0 6px 24px rgba(99,102,241,0.32)' } : {}}
                                    whileTap={!isLoading ? { scale: 0.99 } : {}}
                                >
                                    {isLoading ? (
                                        <>
                                            <motion.div
                                                style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%' }}
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                                            />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            {isLogin ? 'Continue' : 'Create Account'}
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </motion.button>
                            </form>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
