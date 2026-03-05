import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { Notification } from "../../types";
import { API_BASE_URL } from "../api/config";

export function connectNotificationSocket(
  token: string,
  onNotification: (notification: Notification) => void
): () => void {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
    reconnectDelay: 5000,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    onConnect: () => {
      client.subscribe("/user/queue/notifications", (message: IMessage) => {
        try {
          const notification = JSON.parse(message.body) as Notification;
          onNotification(notification);
        } catch {
        }
      });
    },
  });

  client.activate();

  return () => {
    if (client.active) {
      client.deactivate();
    }
  };
}
