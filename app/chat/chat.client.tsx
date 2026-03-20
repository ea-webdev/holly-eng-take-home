'use client';
import { useState, useTransition } from 'react';
import { sendChatMessage, type ChatMessage } from './action';

type Message = {
  content: string;
  id: string;
  role: 'assistant' | 'user';
};

const initialMessage: Message = {
  content: "Hi! I'm Holly your assistant!",
  id: 'welcome',
  role: 'assistant',
};

const ChatClient = () => {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [currentJobKey, setCurrentJobKey] = useState<string | null>(null);
  const [possibleJobs, setPossibleJobs] = useState<string[] | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    const message = userInput.trim();
    if (!message || isPending) return;

    const userMsg: Message = {
      content: message,
      id: createId(),
      role: 'user',
    };

    const history: ChatMessage[] = messages
      .filter((entry) => entry.id !== initialMessage.id)
      .map((entry) => ({
        content: entry.content,
        role: entry.role,
      }));

    setMessages((curr) => [...curr, userMsg]);
    setUserInput('');

    startTransition(async () => {
      const result = await sendChatMessage({
        currentJobKey,
        history,
        message,
        possibleJobs,
      });

      setCurrentJobKey(result.currentJobKey);
      setPossibleJobs(result.possibleJobs);
      setMessages((current) => [
        ...current,
        { content: result.reply, id: createId(), role: 'assistant' },
      ]);
    });
  };
  return (
    <main className='mx-auto max-w-3xl p-4'>
      <h1 className='text-xl font-semibold'>Chat</h1>

      <div className='mt-4 space-y-4'>
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'text-right'
                : 'text-left bg-gray-900 text-white rounded-lg'
            }
          >
            <div className='inline-block max-w-[80%] p-2 text-left'>
              <div className='text-xs uppercase'>{message.role}</div>
              <div className='mt-1'>{message.content}</div>
            </div>
          </div>
        ))}

        {isPending && <p>...</p>}
      </div>

      <form
        className='mt-4'
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <textarea
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          rows={3}
          className='w-full border p-2 rounded-lg resize-none min-h-32'
          placeholder='Type a message'
        />

        <div className='mt-2 flex justify-end'>
          <button
            type='submit'
            disabled={isPending || userInput.trim().length === 0}
            className='border px-3 py-1 disabled:opacity-50 rounded-lg'
          >
            Send
          </button>
        </div>
      </form>
    </main>
  );
};

const createId = () => `${Date.now()}-${Math.random()}`;

export default ChatClient;
