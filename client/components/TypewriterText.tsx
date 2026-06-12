"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  text: string;
  speed?: number;
  className?: string;
}

export default function TypewriterText({ text, speed = 10, className = "" }: Props) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  if (done) {
    return (
      <div className={`markdown-answer ${className}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <span className={className}>
      {displayed}
      <span
        className="anim-blink inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
        style={{ verticalAlign: "middle" }}
      />
    </span>
  );
}
