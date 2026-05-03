"use client";

type VoiceButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    SpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

export function VoiceButton({ disabled, onTranscript }: VoiceButtonProps) {
  function startRecognition() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("当前浏览器不支持语音识别，请先使用文字输入。");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };
    recognition.start();
  }

  return (
    <button className="voice-button" disabled={disabled} onClick={startRecognition} type="button">
      按住说需求
    </button>
  );
}
