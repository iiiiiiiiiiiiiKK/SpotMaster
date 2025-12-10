import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // 导入您的 Pixel Trader 组件

// 如果您需要全局CSS（虽然您的代码是内联的，但这是一个好习惯）
// import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> 
  </React.StrictMode>
);
