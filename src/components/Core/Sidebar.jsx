import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, ChevronLeft, ChevronRight, Shapes } from 'lucide-react';
import './Sidebar.css';

const menuItems = [
  {
    id: 'home',
    label: 'Nesting',
    icon: Home,
    path: '/'
  },
  {
    id: 'svg-generator',
    label: 'SVG Generator',
    icon: Shapes,
    path: '/svg-generator'
  },
  {
    id: 'info',
    label: 'Info',
    icon: Info,
    path: '/info'
  }
];

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleItemClick = (item) => {
    if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header with Toggle */}
      <div className="sidebar-header">
        {!isCollapsed && (
          <h2 className="sidebar-title">Menu</h2>
        )}
        <button 
          className="collapse-button" 
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <div className="sidebar-content">
        {menuItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <div
              key={item.id}
              className={`menu-item ${isActive ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
              title={item.label}
            >
              <div className="menu-item-content">
                <Icon size={20} className="menu-icon" />
                {!isCollapsed && (
                  <span className="menu-label">{item.label}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
