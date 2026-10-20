import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import authService from '../../services/authService';
import AddCommissionMember from './AddCommissionMember';
import UploadInternshipPDF from './UploadInternshipPDF';
import StudentList from './StudentList';
import GradeInternship from './GradeInternship';
import EarlyEvaluation from './EarlyEvaluation';
import './ChairDashboard.css';

const ChairDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activePage, setActivePage] = useState('home');

    useEffect(() => {
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
            navigate('/');
            return;
        }

        // Get user data
        const userData = authService.getCurrentUser();
        setUser(userData);

        // Check if user is actually a commission chair
        if (userData.role?.name !== 'Commission Chair') {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    if (!user) {
        return <div>Yükleniyor...</div>;
    }

    const renderContent = () => {
        switch (activePage) {
            case 'add-member':
                return <AddCommissionMember />;
            case 'upload-pdf':
                return <UploadInternshipPDF />;
            case 'student-list':
                return <StudentList />;
            case 'grade-internship':
                return <GradeInternship />;
            case 'early-evaluation':
                return <EarlyEvaluation />;
            default:
                return (
                    <div>
                        <div className="info-bar">
                            <i className="fa-solid fa-circle-info"></i>
                            <strong>Bilgilendirme:</strong> Komisyon Başkanı Paneline hoş geldiniz.
                        </div>
                        <h2>Ana Sayfa</h2>
                        <p>Hoş geldiniz, <strong>{user.name || user.username}</strong>!</p>
                        <div className="card-container">
                            <div className="card">
                                <h3>Kullanıcı Bilgileri</h3>
                                <p><strong>İsim:</strong> {user.name || user.username}</p>
                                <p><strong>E-posta:</strong> {user.email}</p>
                                <p><strong>Rol:</strong> {user.role?.name}</p>
                                {user.department && <p><strong>Bölüm:</strong> {user.department.name}</p>}
                            </div>
                            <div className="card">
                                <h3>Hızlı İşlemler</h3>
                                <p>Soldaki menüden yapmak istediğiniz işlemi seçebilirsiniz.</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-body">
            <Header />
            
            <div className="dashboard-container">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h3>Komisyon Başkanı</h3>
                    </div>
                    <nav className="sidebar-nav">
                        <ul>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'home' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('home'); }}
                                >
                                    <i className="fa-solid fa-house"></i>
                                    <span>Ana Sayfa</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'add-member' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('add-member'); }}
                                >
                                    <i className="fa-solid fa-user-plus"></i>
                                    <span>Komisyon Üyesi Ekleme</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'upload-pdf' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('upload-pdf'); }}
                                >
                                    <i className="fa-solid fa-file-arrow-up"></i>
                                    <span>Staj PDF Yükleme</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'student-list' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('student-list'); }}
                                >
                                    <i className="fa-solid fa-list-ol"></i>
                                    <span>Öğrenci Listesi</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'grade-internship' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('grade-internship'); }}
                                >
                                    <i className="fa-solid fa-star"></i>
                                    <span>Staj Puanlandır</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="#!" 
                                    className={activePage === 'early-evaluation' ? 'active' : ''}
                                    onClick={(e) => { e.preventDefault(); setActivePage('early-evaluation'); }}
                                >
                                    <i className="fa-solid fa-clock"></i>
                                    <span>Erken Değerlendirme</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {/* Top Navbar */}
                    <nav className="top-navbar">
                        <div className="nav-left">
                            <a href="#!" className="nav-icon" title="Ana Sayfa" onClick={(e) => { e.preventDefault(); setActivePage('home'); }}>
                                <i className="fa-solid fa-house"></i>
                            </a>
                        </div>
                        <div className="nav-right">
                            <div className="profile-menu">
                                <i className="fa-solid fa-circle-user profile-icon"></i>
                                <span className="profile-name">{(user.name || user.username).toUpperCase()}</span>
                            </div>
                            <button className="logout-button-small" onClick={handleLogout}>
                                <i className="fa-solid fa-right-from-bracket"></i> Çıkış
                            </button>
                        </div>
                    </nav>

                    {/* Content Area */}
                    <div className="content-area">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ChairDashboard;
