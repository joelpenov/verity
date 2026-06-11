"use client";

import { useEffect, useState } from "react";

interface Props {
  text: string;
  speed?: number;
  className?: string;
}

export default function TypewriterText({ text, speed = 12, className = "" }: Props) {
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

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span
          className="anim-blink inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
          style={{ verticalAlign: "middle" }}
        />
      )}
    </span>
  );
}
