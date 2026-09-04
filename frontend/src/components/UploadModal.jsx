import React, { useState, useRef } from 'react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message: '' }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (['.nc', '.csv', '.txt', '.tsv'].includes(ext)) {
      setSelectedFile(file);
      setUploadStatus(null);
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Unsupported format. Please select a NetCDF (.nc) or CSV (.csv, .txt) file.'
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.status === 'processed') {
        setUploadStatus({
          type: 'success',
          message: `Successfully processed ${result.filename} (${result.parser} parser). Ocean twin updated!`
        });
        setIsUploading(false);
        if (onUploadSuccess) onUploadSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Failed to process dataset on the server.'
        });
        setIsUploading(false);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus({
        type: 'error',
        message: 'Network error communicating with the ingestion server.'
      });
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(5, 10, 20, 0.75)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '520px',
        maxWidth: '92vw',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
        padding: '24px',
        color: '#e2e8f0',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Upload Oceanographic Dataset
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Ingest NetCDF model grids (.nc), Argo profiles (R*.nc), or CSV CTD casts
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'}`,
            borderRadius: '12px',
            padding: '32px 20px',
            textAlign: 'center',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 41, 59, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '18px'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".nc,.csv,.txt,.tsv"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <div style={{ fontSize: '2.4rem', marginBottom: '10px' }}>📁</div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0' }}>
            {selectedFile ? selectedFile.name : 'Click to browse or drag & drop files here'}
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Supports NetCDF (.nc), CSV/TSV, and Delimited TXT (Max: 200MB)
          </p>
          {selectedFile && (
            <div style={{
              display: 'inline-block',
              marginTop: '12px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.75rem',
              color: '#34d399'
            }}>
              Ready: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </div>
          )}
        </div>

        {/* Status / Alert Banner */}
        {uploadStatus && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            marginBottom: '16px',
            background: uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: uploadStatus.type === 'success' ? '#34d399' : '#f87171'
          }}>
            {uploadStatus.message}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            style={{
              background: !selectedFile || isUploading
                ? 'rgba(99, 102, 241, 0.2)'
                : 'linear-gradient(135deg, #6366f1, #06b6d4)',
              border: 'none',
              color: !selectedFile || isUploading ? '#64748b' : '#ffffff',
              padding: '8px 20px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer',
              boxShadow: !selectedFile || isUploading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isUploading ? 'Ingesting Pipeline...' : 'Start Ingestion'}
          </button>
        </div>
      </div>
    </div>
  );
}
