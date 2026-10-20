import React from 'react';

const Header = () => {
    return (
        <header className="gtu-header">
            <div className="container">
                <img src="/gtu-logo.png" alt="Gebze Teknik Üniversitesi Logo" className="gtu-logo" />
            </div>
            <div className="gtu-strip-container">
                <div className="strip strip-orange"></div>
                <div className="strip strip-red"></div>
                <div className="strip strip-blue"></div>
            </div>
        </header>
    );
};

export default Header;
