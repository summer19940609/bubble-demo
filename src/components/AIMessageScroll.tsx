import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Bubble, Sender } from '@ant-design/x'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Spin } from 'antd'
import { throttle } from 'lodash'
import initialMessagesData from '../data/initialMessages.json'
import './AIMessageScroll.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const AIMessageScroll: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const shouldAutoScroll = useRef(true)

  // AI回复消息数组
  const aiResponseFragments = [
    '你好！',
    '我是AI助手，',
    '很高兴为你服务。',
    '我可以帮助你解答各种问题，',
    '包括编程、',
    '数学、',
    '科学等各个领域。',
    '如果你有任何问题，',
    '随时可以问我。',
    '我会尽力为你提供准确的答案。',
    '让我们一起探索知识的海洋吧！',
  ]

  // 初始化一些消息
  useEffect(() => {
    // 从JSON文件读取固定的10条消息
    const initialMessages: Message[] = initialMessagesData as Message[]
    
    setMessages(initialMessages)
    // 初始化后滚动到底部
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        isInitialMount.current = false
      }
    }, 100)
  }, [])

  // 模拟加载更多历史消息（向上滚动时触发）
  const loadMoreMessagesBase = useCallback(() => {
    if (isLoading) return

    setIsLoading(true)
    shouldAutoScroll.current = false // 加载历史消息时不自动滚动
    
    setTimeout(() => {
      setMessages((prev) => {
        const oldestTimestamp = prev.length > 0 
          ? Math.min(...prev.map(m => m.timestamp)) 
          : Date.now()

        const roles: ('user' | 'assistant')[] = ['user', 'assistant']
        // 使用 Array.from 生成 20 条消息
        const newMessages: Message[] = Array.from({ length: 20 }, (_, i) => {
          const role = roles[Math.floor(Math.random() * roles.length)]
          // 历史消息的时间戳应该更早
          const timestamp = oldestTimestamp - (20 - i) * 1000 - 10000
          
          return {
            id: `${role}-history-${Date.now()}-${i}`,
            role,
            content: role === 'user' 
              ? `消息用户${i + 1}`
              : `消息助手${i + 1}`,
            timestamp,
          }
        })

        // 模拟消息加载完毕
        if (prev.length + newMessages.length > 500) {
          setHasMore(false)
        }

        return [...newMessages, ...prev]
      })
      setIsLoading(false)
    }, 1000)
  }, [isLoading])

  // 使用节流，500ms 内只允许执行一次
  const loadMoreMessages = useMemo(
    () => throttle(loadMoreMessagesBase, 500),
    [loadMoreMessagesBase]
  )

  // 组件卸载时取消节流
  useEffect(() => {
    return () => {
      loadMoreMessages.cancel()
    }
  }, [loadMoreMessages])


  const [inputValue, setInputValue] = useState('')

  // 处理发送消息
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    }
    
    shouldAutoScroll.current = true
    setMessages((prev) => {
      const updated = [...prev, userMessage]
      
      // 模拟AI回复，延迟一点时间
      setTimeout(() => {
        // 从数组中随机选择一个
        const randomFragment = aiResponseFragments[Math.floor(Math.random() * aiResponseFragments.length)]
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `【模拟回复消息】${randomFragment}`,
          timestamp: Date.now(),
        }
        shouldAutoScroll.current = true
        setMessages((prevMessages) => [...prevMessages, aiMessage])
      }, 500)
      
      return updated
    })
    
    setInputValue('') // 清空输入框
  }, [inputValue])

  // 自动滚动到底部（仅在新消息到达时）
  useEffect(() => {
    if (scrollRef.current && (shouldAutoScroll.current || isInitialMount.current)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="ai-message-scroll-container">
      <div className="ai-message-scroll-header">
        <h2>AI消息滚动Demo</h2>
      </div>
      <div
        id="scrollableDiv"
        ref={scrollRef}
        className="ai-message-scroll-content"
      >
        <InfiniteScroll
          dataLength={messages.length}
          next={loadMoreMessages}
          hasMore={hasMore}
          loader={
            <div className="scroll-loader">
              <Spin size="small" />
              <span>加载历史消息中...</span>
            </div>
          }
          scrollableTarget="scrollableDiv"
          inverse={true}
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
        >
          <Bubble.List
            items={messages.map((message) => ({
              key: message.id,
              role: message.role,
              placement: message.role === 'user' ? 'end' : 'start',
              content: message.content,
              header: new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              styles: {
                content: {
                  backgroundColor: message.role === 'user' ? '#f3f3f3' : '#e6ffe6',
                },
              },
            }))}
          />
        </InfiniteScroll>
      </div>
      <div className="ai-message-scroll-footer">
        <Sender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
        />
      </div>
    </div>
  )
}

export default AIMessageScroll

