import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Bubble, Sender, Mermaid, CodeHighlighter } from '@ant-design/x'
import XMarkdown, { type ComponentProps } from '@ant-design/x-markdown'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import InfiniteScroll from 'react-infinite-scroll-component'
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

  // 代码高亮组件
  const Code: React.FC<ComponentProps> = (props) => {
    const { className, children } = props
    const lang = className?.match(/language-(\w+)/)?.[1] || ''

    if (typeof children !== 'string') return null

    // 如果是 mermaid 代码块，使用 Mermaid 组件
    if (lang === 'mermaid') {
      return <Mermaid>{children}</Mermaid>
    }

    // 其他代码使用 CodeHighlighter
    return <CodeHighlighter lang={lang}>{children}</CodeHighlighter>
  }

  // AI回复消息数组（Markdown格式）
  const aiResponseFragments = [
    `## 你好！\n\n我是AI助手，很高兴为你服务。`,
    `### 提示\n\n我可以帮助你解答各种问题，包括：\n\n- 编程\n- 数学\n- 科学\n\n随时可以问我！`,
    `**重要提示**\n\n我会尽力为你提供准确的答案。\n\n让我们一起探索知识的海洋吧！`,
    `\`\`\`javascript\nconsole.log("Hello, World!");\n\`\`\`\n\n这是一段代码示例。`,
    `## 功能说明\n\n1. 支持多种格式\n2. 实时响应\n3. 智能回复\n\n[了解更多](https://example.com)`,
    `> 这是一条引用消息\n\n**加粗文本** 和 *斜体文本* 都可以正常显示。`,
    `## 数学公式示例\n\n这是一个行内公式：$E = mc^2$\n\n这是一个块级公式：\n\n$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$\n\n还有更多公式：\n\n$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$`,
    `## 图片示例\n\n这是谷歌的Logo：\n\n![Google Logo](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)\n\n图片可以很好地展示内容！`,
    `## 综合示例\n\n包含公式：$f(x) = x^2 + 2x + 1$\n\n包含图片：\n\n![Google](https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png)\n\n包含图表：\n\n\`\`\`mermaid\npie title 数据分布\n    "类型A" : 42\n    "类型B" : 30\n    "类型C" : 28\n\`\`\``,
    `## Python 代码示例\n\n这是一个计算斐波那契数列的函数：\n\n\`\`\`python\ndef fibonacci(n):\n    """\n    计算第n个斐波那契数\n    :param n: 位置（必须是正整数）\n    :return: 第n个斐波那契数的值\n    """\n    if n <= 0:\n        return 0\n    elif n == 1:\n        return 1\n    else:\n        a, b = 0, 1\n        for _ in range(2, n+1):\n            a, b = b, a + b\n        return b\n\n# 使用示例\nif __name__ == "__main__":\n    num = 10\n    print(f"第{num}个斐波那契数是: {fibonacci(num)}")\n\`\`\``,
    `## JavaScript 代码示例\n\n这是一个简单的 React Hook 示例：\n\n\`\`\`javascript\nimport { useState, useEffect } from 'react';\n\nfunction useCounter(initialValue = 0) {\n  const [count, setCount] = useState(initialValue);\n  \n  useEffect(() => {\n    console.log(\`当前计数: \${count}\`);\n  }, [count]);\n  \n  const increment = () => setCount(count + 1);\n  const decrement = () => setCount(count - 1);\n  const reset = () => setCount(initialValue);\n  \n  return { count, increment, decrement, reset };\n}\n\`\`\``,
    `## TypeScript 代码示例\n\n这是一个类型安全的函数示例：\n\n\`\`\`typescript\ninterface User {\n  id: number;\n  name: string;\n  email: string;\n}\n\nfunction getUserById(users: User[], id: number): User | undefined {\n  return users.find(user => user.id === id);\n}\n\nconst users: User[] = [\n  { id: 1, name: 'Alice', email: 'alice@example.com' },\n  { id: 2, name: 'Bob', email: 'bob@example.com' }\n];\n\nconst user = getUserById(users, 1);\nconsole.log(user?.name); // Alice\n\`\`\``,
    `## Mermaid 流程图\n\n\`\`\`mermaid\ngraph TD\n    A[开始] --> B{判断条件}\n    B -->|是| C[执行操作1]\n    B -->|否| D[执行操作2]\n    C --> E[结束]\n    D --> E\n\`\`\``,
    `## Mermaid 序列图\n\n\`\`\`mermaid\nsequenceDiagram\n    participant 用户\n    participant AI\n    用户->>AI: 发送消息\n    AI->>AI: 处理消息\n    AI->>用户: 返回回复\n\`\`\``,
  ]

  // 初始化一些消息
  useEffect(() => {
    // 从JSON文件读取固定的10条消息
    const initialMessages: Message[] = initialMessagesData as Message[]

    setMessages(initialMessages)
  }, [])

  // 模拟加载更多历史消息（向上滚动时触发）
  const loadMoreMessagesBase = useCallback(() => {
    console.log('load data');
    if (isLoading) return

    setIsLoading(true)

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
    }, 100)
  }, [isLoading])

  // 使用节流
  const loadMoreMessages = useMemo(
    () => throttle(loadMoreMessagesBase, 100),
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

    setMessages((prev) => {
      const updated = [...prev, userMessage]

      // 模拟AI回复，延迟一点时间
      setTimeout(() => {
        // 从数组中随机选择一个
        const randomFragment = aiResponseFragments[Math.floor(Math.random() * aiResponseFragments.length)]
        const aiMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `【模拟回复markdown消息，随机一种】\n ${randomFragment}`,
          timestamp: Date.now(),
        }
        setMessages((prevMessages) => [...prevMessages, aiMessage])
      }, 500)

      return updated
    })

    setInputValue('') // 清空输入框
  }, [inputValue])


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
        {/* @ts-ignore */}
        <InfiniteScroll
          dataLength={messages.length}
          next={loadMoreMessages}
          hasMore={hasMore}
          scrollableTarget="scrollableDiv"
          inverse={true}
          scrollThreshold="100px"
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
        >
          <Bubble.List
            items={messages.map((message) => ({
              key: message.id,
              role: message.role,
              placement: message.role === 'user' ? 'end' : 'start',
              content: message.content,
              contentRender: message.role === 'assistant' 
                ? (content: string) => (
                    <XMarkdown
                      config={{ extensions: Latex() }}
                      paragraphTag="div"
                      components={{ code: Code }}
                    >
                      {content}
                    </XMarkdown>
                  )
                : undefined,
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
            autoScroll={true}
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

