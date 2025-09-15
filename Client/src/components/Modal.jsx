import React from 'react';
// import './RetailerForm.css';

const Modal = ({ show, onClose, title, children }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;