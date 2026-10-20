import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import authService from '../../services/authService';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    // Step 1: Email, Step 2: Code, Step 3: New Password
    const [step, setStep] = useState(1); 
    
    const [formData, setFormData] = useState({
        email: '',
        code: '',
        newPassword: '',
        confirmPassword: ''
    });
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError('');
        if (success) setSuccess('');
    };

    // Step 1: Send Email with Code
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!formData.email) {
            setError('E-posta adresi giriniz');
            return;
        }

        setLoading(true);
        try {
            await authService.forgotPassword(formData.email);
            setSuccess('Doğrulama kodu e-posta adresinize gönderildi.');
            setStep(2); // Move to code verification
        } catch (err) {
            setError(err.error || 'Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify Code
    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.code || formData.code.length !== 6) {
            setError('Lütfen 6 haneli doğrulama kodunu giriniz');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyResetCode(formData.email, formData.code);
            setSuccess('Kod doğrulandı. Yeni şifrenizi belirleyin.');
            setStep(3); // Move to password reset
        } catch (err) {
            setError(err.error || 'Geçersiz kod.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Set New Password
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Şifreler eşleşmiyor');
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır');
            return;
        }

        setLoading(true);
        try {
            await authService.resetPasswordSecure(formData.email, formData.code, formData.newPassword);
            setSuccess('Şifreniz başarıyla değiştirildi! Giriş sayfasına yönlendiriliyorsunuz...');
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            console.error('Password reset error:', err);
            setError(err.error || 'Şifre sıfırlama sırasında bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/');
    };

    return (
        <>
            <Header />
            <div className="forgot-password-container">
                <div className="forgot-password-box">
                    <h2>Şifre Sıfırlama</h2>
                    
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                    
                    {/* STEP 1: Email Input */}
                    {step === 1 && (
                        <>
                            <p className="reset-info">
                                Sisteme kayıtlı e-posta adresinizi girin. Size bir doğrulama kodu göndereceğiz.
                            </p>
                            <form onSubmit={handleEmailSubmit}>
                                <div className="input-group">
                                    <label htmlFor="email">E-posta</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="ornek@gtu.edu.tr"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
                                </button>
                                <div className="back-to-login">
                                    <a href="#!" onClick={handleBackToLogin}>Giriş Ekranına Dön</a>
                                </div>
                            </form>
                        </>
                    )}

                    {/* STEP 2: Code Input */}
                    {step === 2 && (
                        <>
                            <p className="reset-info">
                                Lütfen <strong>{formData.email}</strong> adresine gelen 6 haneli kodu giriniz.
                            </p>
                            <form onSubmit={handleCodeSubmit}>
                                <div className="input-group">
                                    <label htmlFor="code">Doğrulama Kodu</label>
                                    <input
                                        type="text"
                                        id="code"
                                        name="code"
                                        maxLength="6"
                                        placeholder="123456"
                                        value={formData.code}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                        style={{ letterSpacing: '2px', fontSize: '1.2rem', textAlign: 'center' }}
                                    />
                                </div>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Doğrulanıyor...' : 'Kodu Onayla'}
                                </button>
                                <div className="back-to-login">
                                    <a href="#!" onClick={() => setStep(1)}>E-postayı Değiştir</a>
                                </div>
                            </form>
                        </>
                    )}

                    {/* STEP 3: New Password */}
                    {step === 3 && (
                        <>
                            <p className="reset-info">
                                Yeni şifrenizi belirleyin.
                            </p>
                            <form onSubmit={handlePasswordSubmit}>
                                <div className="input-group">
                                    <label htmlFor="newPassword">Yeni Şifre</label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        placeholder="Yeni şifrenizi giriniz"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="input-group">
                                    <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        placeholder="Yeni şifrenizi tekrar giriniz"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Kaydediliyor...' : 'Şifreyi Değiştir'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};

export default ForgotPassword;
