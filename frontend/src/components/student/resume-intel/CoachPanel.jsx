import { Fragment, useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import {
  errorMessage,
  fetchCoachMessages,
  resetCoach,
  sendCoachMessage,
} from "./useResumeAnalysis";

const SUGGESTIONS = [
  "What should I fix first to raise my score?",
  "Rewrite my weakest bullet points",
  "Which job requirements am I missing?",
  "Find jobs on HIRE.OS that fit my resume",
];

/** **bold** → <strong>, everything else as text (no HTML injection). */
const Inline = ({ text }) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );

/** Minimal markdown: paragraphs, "-"/"*"/"1." lists, **bold**. */
const RichText = ({ text }) => {
  const blocks = [];
  let list = null;
  for (const line of text.split("\n")) {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      list ??= [];
      list.push(item[1]);
      continue;
    }
    if (list) {
      blocks.push({ type: "list", items: list });
      list = null;
    }
    if (line.trim())
      blocks.push({ type: "p", text: line.replace(/^#+\s*/, "") });
  }
  if (list) blocks.push({ type: "list", items: list });

  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {block.items.map((t, j) => (
              <li key={j}>
                <Inline text={t} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={block.text} />
          </p>
        ),
      )}
    </div>
  );
};

const Message = ({ message }) =>
  message.role === "user" ? (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-md bg-[#FFD700]/10 border border-[#FFD700]/20 px-3 py-2 text-sm text-gray-100 whitespace-pre-wrap">
        {message.content}
      </div>
    </div>
  ) : (
    <div className="flex gap-3">
      <div className="w-7 h-7 shrink-0 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
        <Bot className="w-4 h-4 text-[#FFD700]" />
      </div>
      <div className="flex-1 min-w-0 text-sm text-gray-300 leading-relaxed">
        {message.trace?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.trace.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-gray-400"
              >
                <Wrench className="w-3 h-3" />
                {t.summary}
              </span>
            ))}
          </div>
        )}
        <RichText text={message.content} />
      </div>
    </div>
  );

/** Agent chat that reads this report, tests rewrites and searches jobs. */
const CoachPanel = ({ reportId }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchCoachMessages(reportId)
      .then((m) => !cancelled && setMessages(m))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || sending) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setSending(true);
    try {
      const reply = await sendCoachMessage(reportId, message);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
      toast.error(
        errorMessage(e, "The coach couldn't answer. Please try again."),
      );
    } finally {
      setSending(false);
    }
  };

  const startOver = async () => {
    try {
      await resetCoach(reportId);
      setMessages([]);
    } catch (e) {
      toast.error(errorMessage(e, "Could not clear the conversation."));
    }
  };

  return (
    <section className="bg-[#111111] border border-[#FFD700]/20 rounded-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-[#FFD700]">
            <Sparkles className="w-4 h-4" /> Resume Coach
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Ask about this report. The coach looks up your resume, tests
            rewrites against the scoring formula and can search open jobs.
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={startOver}
            disabled={sending}
            className="text-gray-500 hover:text-gray-200"
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Start over
          </Button>
        )}
      </div>

      <div className="max-h-[480px] overflow-y-auto px-5 py-4 space-y-4">
        {loaded && messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:border-[#FFD700]/40 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" /> Coach is
            working…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-end gap-2 border-t border-white/5 p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Ask the coach…"
          className="flex-1 resize-none bg-[#0A0A0A] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#FFD700]/50"
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || !draft.trim()}
          className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </section>
  );
};

export default CoachPanel;
