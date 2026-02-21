import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';

export class Tab extends Model {
  static table = 'tabs';

  @field('remote_id') remoteId!: string | null;
  @field('device_id') deviceId!: string;
  @field('url') url!: string;
  @field('title') title!: string;
  @field('domain') domain!: string;
  @field('is_active') isActive!: boolean;
  @field('is_pinned') isPinned!: boolean;
  @field('group_id') groupId!: number | null;
  @field('favicon') favicon!: string | null;
  @field('last_modified') lastModified!: number;
  @field('sync_status') syncStatus!: string;

  @relation('devices', 'device_id') device!: Device;
}

export class Device extends Model {
  static table = 'devices';

  @field('remote_id') remoteId!: string;
  @field('name') name!: string;
  @field('type') type!: string;
  @field('os') os!: string | null;
  @field('is_online') isOnline!: boolean;
  @field('last_seen') lastSeen!: number;
  @field('public_key') publicKey!: string | null;

  @children('tabs') tabs!: Tab[];
  @children('sessions') sessions!: Session[];
}

export class Session extends Model {
  static table = 'sessions';

  @field('name') name!: string;
  @field('created_at') createdAt!: number;
  @field('device_id') deviceId!: string | null;
  @field('sync_status') syncStatus!: string;

  @relation('devices', 'device_id') device!: Device | null;
  @children('session_tabs') sessionTabs!: SessionTab[];
}

export class SessionTab extends Model {
  static table = 'session_tabs';

  @field('session_id') sessionId!: string;
  @field('url') url!: string;
  @field('title') title!: string;
  @field('is_pinned') isPinned!: boolean;

  @relation('sessions', 'session_id') session!: Session;
}
