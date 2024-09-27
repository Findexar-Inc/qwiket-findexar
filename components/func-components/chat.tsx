'use client';
import React, { useState, useRef, useEffect, useCallback } from "react";
import useSWR from 'swr';
import { useAppContext } from '@lib/context';
import { motion } from 'framer-motion';
import { Chat, Message } from "@lib/types/chat";
import { actionChat, actionChatName, actionCreateChat, actionLoadLatestChat, CreateChatProps } from "@lib/fetchers/chat";
import ReactMarkdown, { Components } from 'react-markdown';
import { FaPaperPlane, FaChevronDown, FaChevronUp, FaCopy, FaCheck } from 'react-icons/fa';
import { actionUserRequest } from "@lib/actions/user-request";
import MyChats from "@components/func-components/mychats";
import { MyChatsKey, CreateChatKey } from "@lib/keys";
import { HiOutlinePencilAlt } from "react-icons/hi";
import { useRouter, useSearchParams } from 'next/navigation';
import type { UserAccount } from '@lib/types/user';
import Link from 'next/link';

interface Props {
    chatUUId?: string;
    isFantasyTeam?: boolean;
    source?: string;
}

const ChatsComponent: React.FC<Props> = ({
    chatUUId: chatUUIdProp,
    isFantasyTeam,
    source
}) => {
    const { fallback, prompt, promptUUId, mode, isMobile, noUser, setLeague, setView, setPagetype, setTeam, setPlayer, setMode, fbclid, utm_content, params, tp, league, pagetype, teamid, player, teamName, setTeamName, athleteUUId, userAccount, userAccountMutate, user } = useAppContext();
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [userInput, setUserInput] = useState<string>(prompt || '');
    const responseTextareaRef = useRef<HTMLDivElement>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const responseSetRef = useRef(false);
    const [chatUUId, setChatUUId] = useState<string>(prompt ? '_new' : (chatUUIdProp || ""));
    const [chatName, setChatName] = useState<string>('');
    const [openMyChats, setOpenMyChats] = useState<boolean>(false);
    const [updateMessage, setUpdateMessage] = useState<string>('');
    const [pendingUserRequest, setPendingUserRequest] = useState<boolean>(false);
    const [provisionalChatUUId, setProvisionalChatUUId] = useState<string>('');
    const [provisionalUserInput, setProvisionalUserInput] = useState<string>('');
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const createChatKey: CreateChatKey = { email: user.email, type: "create-chat", chatUUId: chatUUId, league: league.toUpperCase(), teamid, athleteUUId, fantasyTeam: false };
    const { data: loadedChat, error: loadedChatError, isLoading: isLoadingChat } = useSWR(createChatKey, actionLoadLatestChat, { fallback });
    console.log('==> CHAT.TSX isLoadingChat', isLoadingChat, createChatKey);
    console.log("==> CHAT.TSX loadedChat", JSON.stringify(loadedChat));
    const { extraCreditsRemaining, creditsRemaining } = userAccount as UserAccount || {};
    const totalCredits = (creditsRemaining || 0) + (extraCreditsRemaining || 0);

    let creditsString = creditsRemaining ? creditsRemaining.toString() : "0";
    if (extraCreditsRemaining && +extraCreditsRemaining > 0) {
        creditsString = creditsString + "/" + extraCreditsRemaining.toString();
    }
    creditsString += ' credits.'
    if (totalCredits < 10) {
        creditsString += " Upgrade";
    }

    const creditColorClass = totalCredits === 0
        ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
        : totalCredits < 5
            ? "text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
            : "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300";

    const router = useRouter();
    const searchParams = useSearchParams();

    const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
    const [initialPromptUUId, setInitialPromptUUId] = useState<string | null>(null);

    useEffect(() => {
        const prompt = searchParams?.get('prompt') || "";
        const promptUUId = searchParams?.get('promptUUId') || "";

        if (prompt) setInitialPrompt(prompt);
        if (promptUUId) setInitialPromptUUId(promptUUId);

        if (prompt || promptUUId) {
            const url = new URL(window.location.href);
            url.searchParams.delete('prompt');
            url.searchParams.delete('promptUUId');
            router.replace(url.toString());
        }
    }, []);

    useEffect(() => {
        if (initialPrompt) {
            setUserInput(initialPrompt);
        }
    }, [initialPrompt]);

    useEffect(() => {
        setChatUUId(prompt ? "_new" : (chatUUIdProp || ""));
        setMessages([]);
        setChatName('');
    }, [league])
    /* useEffect(() => {
         setIsLoading(isLoadingChat);
     }, [isLoadingChat]);*/

    const update = useCallback((message: string) => {
        setUpdateMessage(message);
        setTimeout(() => {
            setUpdateMessage('waiting for response...');
            setTimeout(() => {
                setUpdateMessage('');
            }, 6000);
        }, 2000);
    }, []);

    const userRequest = useCallback(() => {
        setPendingUserRequest(false);
        actionUserRequest({
            chatUUId: provisionalChatUUId || chatUUId,
            promptUUId: initialPromptUUId || "",
            userRequest: provisionalUserInput || textareaRef.current?.value.trim() || "",
            athleteUUId: athleteUUId,
            teamid: teamid,
            league: league,
            fantasyTeam: isFantasyTeam || false,
            onUpdate: (content: string) => {
                setUpdateMessage('');
                setResponse(prev => {
                    const updatedContent = prev + content;
                    setMessages(prevMessages => {
                        const updatedMessages = [...prevMessages];
                        if (updatedMessages.length > 0) {
                            updatedMessages[updatedMessages.length - 1].content = updatedContent;
                        }
                        return updatedMessages;
                    });
                    return updatedContent;
                });
            },
            onDone: () => {
                setUpdateMessage('');
                userAccountMutate();
                setIsLoading(false);
                actionChatName({ chatUUId }).then(
                    (data) => {
                        if (data.success) {
                            setChatName(data.chatName);
                        }
                    }
                );
                setInitialPrompt(null);
                setInitialPromptUUId(null);
            },
            onChatUUId: (content: string) => {
                setChatUUId(prev => {
                    return content;
                });
            },
            onMetaUpdate: (content: string) => {
                update(content);
            }
        }).catch(error => {
            console.error("Error in actionUserRequest:", error);
            setIsLoading(false);
        }).finally(() => {
            setIsLoading(false);
        });
        setProvisionalChatUUId('');
        setProvisionalUserInput('');
    }, [chatUUId, provisionalChatUUId, athleteUUId, teamid, league, isFantasyTeam, initialPromptUUId])

    useEffect(() => {
        if (chatUUId && chatUUId != '_new' && chatUUId != 'blocked' && pendingUserRequest || provisionalChatUUId && pendingUserRequest) {
            setPendingUserRequest(false);
            userRequest();
        }
        if (chatUUId && chatUUId == 'blocked') {
            setIsLoading(false);
            setPendingUserRequest(false);
            setChatUUId('');
            setUpdateMessage('Your request could not be processed due to browser settings blocking user sessions. Please adjust your settings to allow sessions (cookies) and try again.');
        }
    }, [chatUUId, provisionalChatUUId, pendingUserRequest]);

    useEffect(() => {
        setIsLoading(false);
        if (loadedChat && !loadedChatError && !isLoadingChat && loadedChat.success) {
            setChatUUId(loadedChat.chat.chatUUId);
            if (loadedChat.chat.messages) {
                setMessages(loadedChat.chat.messages);
            }
            if (loadedChat?.chat?.name?.includes("ChatGPT")) {
                setChatName(loadedChat?.chat?.name?.replace("ChatGPT", "QwiketAI") || 'New Chat');
            } else {
                setChatName(loadedChat?.chat?.name || 'New Chat');
            }

        }
    }, [loadedChat]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const currentUserInput = textareaRef.current?.value.trim();
        if (!currentUserInput) return;
        update('Loading...');
        const insider = currentUserInput.toLowerCase().indexOf("qw:") == 0;
        const userInputCleaned = currentUserInput.replace(/qw:/i, "");
        const newMessage: Message = {
            role: 'user',
            content: userInputCleaned
        };
        setProvisionalUserInput((prev) => {
            return userInputCleaned;
        });
        setIsLoading(true);
        setResponse('');
        const assistantMessage: Message = {
            role: 'QwiketAI',
            content: ''
        };
        setMessages(prevMessages => [...prevMessages, newMessage, assistantMessage]);
        try {
            if (!chatUUId || chatUUId == '_new') {
                setIsLoading(true);
                setPendingUserRequest(true);
                actionCreateChat({ teamid, league, athleteUUId, insider, fantasyTeam: isFantasyTeam || false }).then(
                    (chatUUId) => {
                        setProvisionalChatUUId((prev) => {
                            return chatUUId as string;
                        });
                    }
                );
            }
            else {
                userRequest();
            }
        } catch (error) {
            console.error("Error in actionUserRequest:", error);
            setIsLoading(false);
        }
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.value = '';
                responseSetRef.current = false;
            }
        }, 1000);
    }, [chatUUId, athleteUUId, teamid, league, isFantasyTeam])

    useEffect(() => {
        if (responseTextareaRef.current) {
            responseTextareaRef.current.scrollTop = responseTextareaRef.current.scrollHeight;
        }
    }, [response]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as React.FormEvent);
        }
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    if (!league) {
        return <><br /><h2 className="text-xl min-h-screen font-bold p-4">Please select a league first.</h2></>;
    }

    const MarkdownComponents: Partial<Components> = {
        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-8" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-semibold my-4" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-lg font-medium my-2 mt-8" {...props} />,
        p: ({ node, ...props }) => <p className="my-2" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-inside my-2 mt-4" {...props} />,
        li: ({ node, ...props }) => <li className="my-1" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-bold mt-4" {...props} />,
        a: ({ node, href, children, ...props }) => (
            <a href={href} className="text-blue-500 hover:underline" {...props}>
                {children}
            </a>
        ),
        img: ({ node, ...props }) => (
            <img
                {...props}
                width="64"
                height="64"
                style={{ width: '64px', height: '64px', objectFit: 'cover' }}
            />
        ),
        code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return (
                <code
                    className={`${match ? 'block bg-gray-100 dark:bg-gray-800 rounded p-2 my-2' : 'bg-gray-200 dark:bg-gray-700 rounded px-1'}`}
                    {...props}
                >
                    {children}
                </code>
            );
        },
    };

    const BlinkingDot = () => (
        <motion.span
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block ml-1"
        >
            •
        </motion.span>
    );

    const copyToClipboard = (content: string, index: number) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => {
                setCopiedMessageIndex(null);
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy content: ', err);
        });
    };

    const FlashingCircle = () => (
        <motion.div
            className="absolute -inset-1.5 rounded-full"
            animate={{
                boxShadow: [
                    '0 0 0 0 rgba(0, 255, 255, 0)',
                    '0 0 0 6px rgba(0, 255, 255, 0.3)'
                ]
            }}
            transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: 'reverse'
            }}
        />
    );
    const drawChatName = chatName && chatName.length > 0 ? chatName : loadedChat?.chat?.name || 'New Chat';
    const drawMessages = (messages && messages.length > 0) ? messages : loadedChat?.chat?.messages || [];
    // console.log("==> CHAT.TSX drawMessages", JSON.stringify(drawMessages));
    // console.log("==> CHAT.TSX drawChatName", loadedChat?.chat?.name, drawChatName, chatName);
    return (
        <div className="flex flex-col bg-white dark:bg-black w-full relative">
            <div className="flex-shrink-0 lg:p-4 p-4 pt-2 lg:pt-4 h-[80px] relative z-1">
                <div className="flex items-center justify-between md:h-8 h-16">
                    <div className="flex items-center">
                        <button
                            onClick={() => setOpenMyChats(!openMyChats)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                            {openMyChats ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        <h1 className="ml-4 text-lg font-bold text-gray-800 dark:text-gray-200">{drawChatName}</h1>
                    </div>
                    <div className="flex flex-col items-end h-16 mt-4">
                        <button
                            onClick={() => {
                                setChatUUId("_new");
                                setMessages([]);
                                setChatName('New Chat');
                                setOpenMyChats(false);
                                setIsLoading(false);
                            }}
                            className={`text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-200 font-bold py-2 px-4 rounded ${drawChatName === 'New Chat' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={drawChatName === 'New Chat'}
                        >
                            <HiOutlinePencilAlt size={24} />
                        </button>
                        <Link
                            href="/account/dashboard"
                            className={`text-xs ${creditColorClass} hover:underline mt-1`}
                        >
                            {creditsString}
                        </Link>
                    </div>
                </div>
                <div
                    className={`absolute top-full left-0 w-full bg-white dark:bg-black z-30 transition-all duration-300 overflow-hidden ${openMyChats ? 'max-h-96' : 'max-h-0'}`}
                >
                    <MyChats
                        onChatSelect={async (selectedChatUUId) => {
                            setChatUUId(selectedChatUUId);
                            setTimeout(() => {
                                setOpenMyChats(false);
                            }, 200);
                        }}
                        onNewChat={async () => {
                            setChatUUId("_new");
                            setMessages([]);
                            setChatName('New Chat');
                            setOpenMyChats(false);
                        }}
                        onFirstChat={(firstChat) => {
                        }}
                    />
                </div>
            </div>

            <div className={`overflow-y-auto mb-32 p-4 pb-16 relative z-0 ${openMyChats ? 'opacity-50' : ''}`}>
                {drawMessages.length === 0 && (
                    <>
                        <p className="text-gray-600 dark:text-gray-400 italic text-center mt-8">
                            Please note that AI results may not always be reliable. It&apos;s recommended to ask follow-up questions for clarification and verify important information from trusted sources.
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 italic text-center mt-4">
                            Regular credits are reset every month depending on the subscription, except for the free trial. Extra credits never expire and will be applied when the regular credits run out.
                        </p>
                    </>
                )}
                {drawMessages.map((message, index) => (
                    <div key={index} className={`mb-2 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[95%] p-3 rounded-2xl ${message.role === 'user'
                            ? 'bg-blue-100 dark:bg-teal-800'
                            : 'bg-gray-100 dark:bg-gray-700'
                            } text-gray-800 dark:text-gray-200`}>
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold">{message.role === 'user' ? 'You     ' : 'QwiketAI     '}</p>
                                {message.role !== 'user' && message.content.length >= 20 && (
                                    <button
                                        onClick={() => copyToClipboard(message.content, index)}
                                        className={`${copiedMessageIndex === index
                                            ? 'text-green-500 dark:text-green-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-grayr:text-gray-700 dark:text-gray-200'
                                            } transition-colors duration-200`}
                                    >
                                        {copiedMessageIndex === index ? <FaCheck size={14} /> : <FaCopy size={14} />}
                                    </button>
                                )}
                            </div>
                            <ReactMarkdown components={MarkdownComponents}>
                                {message?.content?.replace(/<img/g, '<img width="64" height="64" ') || ''}
                            </ReactMarkdown>
                            {isLoading && index === messages.length - 1 && message.role === 'QwiketAI' && <BlinkingDot />}
                        </div>
                    </div>
                ))}
                <div className="flex justify-center items-center h-2 pt-4 text-xs text-gray-500 dark:text-gray-400">
                    {updateMessage || "***"}
                </div>
                <div className="p-0 mt-4">
                    <form onSubmit={handleSubmit} className="relative">
                        <textarea
                            ref={textareaRef}
                            defaultValue={userInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Message to QwiketAI"
                            className={`w-full p-3 pr-16 border rounded-lg text-gray-800 dark:text-gray-200 bg-white dark:bg-black resize-none ${openMyChats ? 'opacity-50' : ''}`}
                            rows={3}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-teal-500 hover:text-teal-600 dark:text-cyan-400 dark:hover:text-cyan-300"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-800 dark:border-gray-200"></div>
                            ) : (
                                <div className="relative p-1.5">
                                    {messages.length === 0 && userInput.trim() !== '' && <FlashingCircle />}
                                    <FaPaperPlane size={18} />
                                </div>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <div className="flex-shrink-0 fixed bottom-0 w-full max-w-[600px] bg-white dark:bg-black border-gray-200 dark:border-gray-700">
            </div>
        </div>
    );
};

export default ChatsComponent;