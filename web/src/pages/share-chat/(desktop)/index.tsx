import { DraggablePanel, Tooltip, } from "@lobehub/ui";
import { useEffect, useState } from "react";
import {  GetChatDialogHistory, GetChatShareApplication } from "../../../services/ChatApplicationService";
import Divider from "@lobehub/ui/es/Form/components/FormDivider";
import { Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons';
import styled from "styled-components";

import { Flexbox } from 'react-layout-kit';
import CreateDialog from "../feautres/CreateDialog";
import { generateRandomString } from "../../../utils/stringHelper";
import ChatAppList from "../../../components/ChatAppList";
import FastChatInput from "../../../components/FastChatInput";
import { isMobileDevice } from "../../../components/ResponsiveIndex";
import { IndexedDBWrapper } from "../../../utils/IndexedDBWrapper";

const sessionName = 'fast-wiki-dialog';
const sessionVersion = 1;
const sessionStoreName = 'sessions';
const sessionDB = new IndexedDBWrapper(sessionName, sessionVersion, sessionStoreName);
sessionDB.open();

const DialogList = styled.div`
    margin-top: 8px;
    padding: 8px;
    overflow: auto;
    height: calc(100vh - 110px);
`;

const DialogItem = styled.div`
    padding: 8px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    margin-bottom: 8px;
    transition: border-color 0.3s linear;
    &:hover {
        border-color: #1890ff;
    }

    // 当组件被选中时修改样式
    &.selected {
        border-color: #1890ff;
    }
`;

export default function DesktopLayout() {
    const id = new URLSearchParams(window.location.search).get('id') as string;
    if (!id) {
        return (<div style={{
            textAlign: 'center',
            fontSize: "20px"
        }}>
            请提供分享Id
        </div>)
    }

    /**
     * 获取游客id
     */
    let guestId = localStorage.getItem('ChatShare') as string;
    if (!guestId) {
        guestId = generateRandomString(10)
        localStorage.setItem('ChatShare', guestId)
    }
    const [application, setApplication] = useState(null as any);
    const [dialogs, setDialogs] = useState([] as any[]);
    const [createDialogVisible, setCreateDialogVisible] = useState(false);
    const [dialog, setDialog] = useState({} as any);
    const [history, setHistory] = useState([] as any[]);
    const [expanded, setExpanded] = useState(true);
    const [input] = useState({
        page: 1,
        pageSize: 20
    });

    useEffect(() => {
        loadingApplication();
    }, [id])


    async function loadingApplication() {
        const app = await GetChatShareApplication(id as any);
        setApplication(app)
    }



    async function loadingDialogs() {
        try {
            const result = (await sessionDB.getAll()) as any[];
            setDialogs(result);
            if (result.length === 0) {
                const v = {
                    name: '默认对话',
                    description: '默认创建的对话',
                    applicationId: id,
                    id: Math.random().toString(36).slice(-8),
                    type: 0
                };
                
                await sessionDB.add(v)
                loadingDialogs();

                return;
            }
            setDialog(result[0]);
        } catch (error) {

        }
    }

    async function LoadingSession() {
        try {
            if (dialog.id === undefined) {
                return;
            }
            const result = await GetChatDialogHistory(dialog.id, input.page, input.pageSize);

            const history = result.result.map((item: any) => {
                return {
                    content: item.content,
                    createAt: item.createAt,
                    extra: {},
                    id: item.id,
                    meta: {
                        avatar: item.current ? "https://blog-simple.oss-cn-shenzhen.aliyuncs.com/Avatar.jpg" : "https://blog-simple.oss-cn-shenzhen.aliyuncs.com/chatgpt.png",
                        title: item.current ? "我" : "AI助手",
                    },
                    role: item.current ? 'user' : 'assistant',
                };
            });

            setHistory(history);

            // 等待1秒后滚动到底部
            setTimeout(() => {
                const chatlayout = document.getElementById('chat-layout');
                if (chatlayout) {
                    chatlayout.scrollTop = chatlayout.scrollHeight;
                }
            }, 1000);
        } catch (error) {

        }
    }

    useEffect(() => {
        if (dialog) {
            LoadingSession();
        }
    }, [dialog, input]);

    useEffect(() => {
        loadingDialogs();
        setExpanded(!isMobileDevice());
    }, []);


    async function deleteDialog(itemId: string) {
        await sessionDB.deleteStr(itemId);
    }


    return <><Flexbox
        height={'100%'}
        horizontal
        width={'100%'}
    >
        <DraggablePanel
            placement="left"
            mode="fixed"
            expand={expanded}
            resize={false}
            pin={true}
            minWidth={0}
            showHandlerWhenUnexpand={true}
            onExpandChange={(v) => {
                setExpanded(v);
            }}
        >
            <DialogList>
                {
                    dialogs?.map((item: any) => {
                        return <DialogItem
                            key={item.id}
                            // 当组件被选中时修改样式
                            className={dialog?.id === item.id ? 'selected' : ''}
                            onClick={() => {
                                setDialog(item);
                            }}>
                            <Tooltip title={item.description}>
                                {item.name}
                            </Tooltip>
                            <Button
                                style={{
                                    float: 'inline-end',
                                }}
                                size='small'
                                icon={<DeleteOutlined />}
                                onClick={() => deleteDialog(item.id)}
                            />
                        </DialogItem>
                    })
                }
                <Button onClick={() => setCreateDialogVisible(true)} style={{
                    marginTop: 8
                }} block>新建对话</Button>

            </DialogList>
        </DraggablePanel>
        <Flexbox style={{ height: '100vh', position: 'relative', width: '100%' }}>
            <div style={{ height: 60 }}>
                <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    textAlign: 'left',
                    padding: 15
                }}>
                    {dialog.name}
                </div>
            </div>
            <Divider />

            <Flexbox style={{ overflow: 'auto', flex: 1 }}>
                <ChatAppList setHistory={(v: any[]) => {
                    setHistory(v);
                }} history={history} application={application} />
            </Flexbox>
            <DraggablePanel style={{
                height: '100%'
            }} maxHeight={600} minHeight={180} placement='bottom'>
                <FastChatInput dialog={dialog} application={application} setHistory={(v: any[]) => {
                    setHistory(v);
                }} history={history} />
            </DraggablePanel>

            <CreateDialog db={sessionDB} chatId={guestId} visible={createDialogVisible} id={application?.id} type={1} onClose={() => {
                setCreateDialogVisible(false);
                loadingDialogs();
            }} onSucess={() => {
                setCreateDialogVisible(false);
                loadingDialogs();
            }} />
        </Flexbox>
    </Flexbox>
    </>
}