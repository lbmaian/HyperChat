<script lang="ts">
  import { onDestroy, afterUpdate, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import dark from 'smelte/src/dark';
  import WelcomeMessage from './WelcomeMessage.svelte';
  import Message from './Message.svelte';
  import PinnedMessage from './PinnedMessage.svelte';
  import PaidMessage from './PaidMessage.svelte';
  import MembershipItem from './MembershipItem.svelte';
  import {
    paramsTabId,
    paramsFrameId,
    paramsIsReplay
  } from '../ts/chat-constants';
  import { responseIsAction } from '../ts/chat-utils';
  import Button from 'smelte/src/components/Button';

  const welcome = { welcome: true, message: { messageId: 'welcome' } };
  type Welcome = typeof welcome;

  const CHAT_HISTORY_SIZE = 150;
  // const TRUNCATE_SIZE = 20;
  // let messageActions: (Chat.MessageAction | Welcome)[] = [];
  let pinned: Ytc.ParsedPinned | null;
  let div: HTMLElement;
  let isAtBottom = true;
  let port: Chat.Port;
  let truncateInterval: number;
  const isReplay = paramsIsReplay;

  const messages: Array<Chat.MessageAction | Welcome> = new Array(CHAT_HISTORY_SIZE);
  let current = 0;
  type MessageRotate = { index: number, message: Chat.MessageAction | Welcome, shown: boolean };
  let rotating: MessageRotate[] = [];

  const isWelcome = (m: Chat.MessageAction | Welcome): m is Welcome =>
    m != null ? 'welcome' in m : false;

  const checkAtBottom = () => {
    isAtBottom =
      Math.ceil(div.clientHeight + div.scrollTop) >= div.scrollHeight - 2;
  };

  const scrollToBottom = () => {
    div.scrollTop = div.scrollHeight;
  };

  const updateRotatingArray = () => {
    const result = [];
    for (let i = 0; i < 2 * messages.length - 1; i++) {
      const message = messages[i % messages.length];
      result.push({
        index: i,
        message,
        shown: message != null && i >= current && i < current + messages.length
      });
    }
    rotating = result;
  };

  // const checkTruncateMessages = (): void => {
  //   const diff = messageActions.length - CHAT_HISTORY_SIZE;
  //   if (diff > TRUNCATE_SIZE) messageActions.splice(0, diff);
  //   messageActions = messageActions;
  // };

  const newMessages = (
    messagesAction: Chat.MessagesAction, isInitial: boolean
  ) => {
    if (!isAtBottom) return;
    messagesAction.messages.forEach((m) => {
      // Filter out initial messages on replays that aren't negative timestamped
      if (isInitial && isReplay && !m.message.timestamp.startsWith('-')) return;
      messages[current] = m;
      current++;
      current %= messages.length;
    });
    if (isInitial) messages.push(welcome);
    updateRotatingArray();
    // messageActions.push(...(
    //   isInitial && isReplay
    //     ? messagesAction.messages.filter(
    //       (a) => a.message.timestamp.startsWith('-')
    //     )
    //     : messagesAction.messages
    // ));
    // if (!isInitial) checkTruncateMessages();
  };

  const onBonk = (bonk: Ytc.ParsedBonk) => {
    messages.forEach((action) => {
      if (isWelcome(action)) return;
      if (action.message.author.id === bonk.authorId) {
        action.deleted = { replace: bonk.replacedMessage };
      }
    });
  };

  const onDelete = (deletion: Ytc.ParsedDeleted) => {
    messages.some((action) => {
      if (isWelcome(action)) return false;
      if (action.message.messageId === deletion.messageId) {
        action.deleted = { replace: deletion.replacedMessage };
        return true;
      }
      return false;
    });
  };

  const onChatAction = (action: Chat.Actions, isInitial = false) => {
    switch (action.type) {
      case 'messages':
        newMessages(action, isInitial);
        break;
      case 'bonk':
        onBonk(action.bonk);
        break;
      case 'delete':
        onDelete(action.deletion);
        break;
      case 'pin':
        pinned = action;
        break;
      case 'unpin':
        pinned = null;
        break;
      case 'forceUpdate':
        // messages = [...action.messages];
        newMessages({ type: 'messages', messages: action.messages }, isInitial);
        break;
    }
  };

  const onPortMessage = (response: Chat.BackgroundResponse) => {
    // console.debug({ response });
    if (responseIsAction(response)) {
      onChatAction(response);
      return;
    }
    switch (response.type) {
      case 'initialData':
        response.initialData.forEach((action) => {
          onChatAction(action, true);
        });
        // messageActions = [...messageActions, welcome];
        break;
      case 'themeUpdate':
        dark().set(response.dark);
        break;
      default:
        console.error('Unknown payload type', { port, response });
        break;
    }
  };

  // Doesn't work well with onMount, so onLoad will have to do
  const onLoad = () => {
    document.body.classList.add('overflow-hidden');

    if (paramsTabId == null || paramsFrameId == null || paramsTabId.length < 1 || paramsFrameId.length < 1) {
      console.error('No tabId or frameId found from params');
      return;
    }

    const frameInfo = {
      tabId: parseInt(paramsTabId),
      frameId: parseInt(paramsFrameId)
    };
    port = chrome.runtime.connect();
    port.onMessage.addListener(onPortMessage);

    port.postMessage({
      type: 'registerClient',
      frameInfo,
      getInitialData: true
    });
    port.postMessage({
      type: 'getTheme',
      frameInfo
    });
  };

  afterUpdate(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
    tick().then(checkAtBottom);
  });

  onDestroy(() => {
    port.disconnect();
    if (truncateInterval) window.clearInterval(truncateInterval);
  });

  const containerClass = 'h-screen w-screen text-black dark:text-white dark:bg-black dark:bg-opacity-25';
  const contentClass = 'content absolute overflow-y-scroll w-full h-full flex-1 px-2';
  const pinnedClass = 'absolute top-2 inset-x-2';
</script>

<svelte:window on:resize={scrollToBottom} on:load={onLoad} />

<div class={containerClass} style="font-size: 13px">
  <div class={contentClass} bind:this={div} on:scroll={checkAtBottom}>
    {#each rotating as rotate (rotate.index)}
      <div class="my-2" class:hidden={!rotate.shown}>
        {#if rotate.message != null}
          {#if isWelcome(rotate.message)}
            <WelcomeMessage />
          {:else if (rotate.message.message.superChat || rotate.message.message.superSticker)}
            <PaidMessage message={rotate.message.message} />
          {:else if rotate.message.message.membership}
            <MembershipItem message={rotate.message.message} />
          {:else}
            <Message message={rotate.message.message} deleted={rotate.message.deleted} />
          {/if}
        {/if}
      </div>
    {/each}
  </div>
  {#if pinned}
    <div class={pinnedClass}>
      <PinnedMessage pinned={pinned} />
    </div>
  {/if}
  {#if !isAtBottom}
    <div
      class="absolute left-1/2 transform -translate-x-1/2 bottom-0 pb-1"
      transition:fade={{ duration: 150 }}
    >
      <Button icon="arrow_downward" on:click={scrollToBottom} small />
    </div>
  {/if}
</div>

<style>
  .content {
    scrollbar-width: thin;
    scrollbar-color: #888 transparent;
  }
  .content::-webkit-scrollbar {
    width: 4px;
  }
  .content::-webkit-scrollbar-track {
    background: transparent;
  }
  .content::-webkit-scrollbar-thumb {
    background: #888;
  }
  .content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
