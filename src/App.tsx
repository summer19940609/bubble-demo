import React from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AIMessageScroll from './components/AIMessageScroll'
import './App.css'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        <AIMessageScroll />
      </div>
    </ConfigProvider>
  )
}

export default App

