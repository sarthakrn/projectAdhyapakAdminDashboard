import React from 'react';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="content-container">
          <Breadcrumb />
          <div className="page-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;