export class WebSocketHub {
  private static tripRooms = new Map<number, Set<any>>();
  private static userSockets = new Map<string, Set<any>>();

  static joinTripRoom(tripId: number, socket: any) {
    if (!this.tripRooms.has(tripId)) {
      this.tripRooms.set(tripId, new Set());
    }
    this.tripRooms.get(tripId)!.add(socket);
  }

  static leaveTripRoom(tripId: number, socket: any) {
    const room = this.tripRooms.get(tripId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.tripRooms.delete(tripId);
      }
    }
  }

  static broadcastToTripRoom(tripId: number, message: any) {
    const room = this.tripRooms.get(tripId);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const client of room) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(payload);
        } catch (err) {
          room.delete(client);
        }
      } else {
        room.delete(client);
      }
    }
    if (room.size === 0) {
      this.tripRooms.delete(tripId);
    }
  }

  static registerUserSocket(userId: string, socket: any) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket);
  }

  static unregisterUserSocket(userId: string, socket: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Directly sends a real-time event to all active sockets belonging to a specific user.
   */
  static sendToUser(userId: string, message: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const payload = JSON.stringify(message);
    for (const client of sockets) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(payload);
        } catch {
          sockets.delete(client);
        }
      } else {
        sockets.delete(client);
      }
    }
    if (sockets.size === 0) {
      this.userSockets.delete(userId);
    }
  }

  /**
   * Displaces any active client connected for this user on other devices.
   */
  static notifySessionDisplaced(userId: string, newDevice?: string) {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    const payload = JSON.stringify({
      type: 'SESSION_TERMINATED',
      reason: 'concurrent_login',
      device: newDevice || 'Another Device',
      messageAr: 'تم تسجيل الدخول إلى حسابك من جهاز آخر. تم إنهاء الجلسة لحماية بياناتك.',
      messageEn: 'Your account was logged into from another device. Session terminated.',
    });

    for (const client of sockets) {
      if (client.readyState === 1) {
        try {
          client.send(payload);
          client.close(4001, 'Concurrent session detected');
        } catch {}
      }
    }
    this.userSockets.delete(userId);
  }

  /**
   * Broadcasts a real-time event to all connected trip rooms and user sockets.
   * Used for new trip/bus announcements and system alerts.
   */
  static broadcastToAll(message: any) {
    const payload = JSON.stringify(message);

    for (const room of this.tripRooms.values()) {
      for (const client of room) {
        if (client.readyState === 1) {
          try {
            client.send(payload);
          } catch {}
        }
      }
    }

    for (const userSet of this.userSockets.values()) {
      for (const client of userSet) {
        if (client.readyState === 1) {
          try {
            client.send(payload);
          } catch {}
        }
      }
    }
  }
}
