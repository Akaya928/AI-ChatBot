import WebSocket from "ws";
import { PlatformAdapter, InternalMessage } from "./types";

export class OneBotAdapter implements PlatformAdapter {
  name = "onebot";
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  onStart(handler: (msg: InternalMessage) => Promise<void>): void {
    this.connect(handler);
  }

  sendMessage(target: { type: "group" | "private"; userId: string; groupId?: string }, text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const action = target.type === "group" ? "send_group_msg" : "send_private_msg";
    const params: any = { message: text };
    if (target.type === "group" && target.groupId) {
      params.group_id = Number(target.groupId);
    } else {
      params.user_id = Number(target.userId);
    }
    this.ws.send(JSON.stringify({ action, params }));
  }

  sendRaw(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private connect(handler: (msg: InternalMessage) => Promise<void>): void {
    this.ws = new WebSocket(this.url);
    this.ws.on("open", () => console.log("[OneBot] connected"));
    this.ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.post_type === "message") {
          const msg: InternalMessage = {
            type: data.message_type === "group" ? "group" : "private",
            userId: String(data.user_id || data.sender?.user_id || ""),
            groupId: data.group_id ? String(data.group_id) : undefined,
            message: data.message,
            rawMessage: data.raw_message || "",
            messageId: data.message_id,
          };
          handler(msg);
        }
      } catch {}
    });
    this.ws.on("close", () => {
      console.log("[OneBot] disconnected, reconnecting in 5s...");
      setTimeout(() => this.connect(handler), 5000);
    });
    this.ws.on("error", (e) => {
      console.error("[OneBot] error:", e.message);
    });
  }
}
