# Popup 组件更新说明

## 需要添加的功能

### 1. 搜索功能

在 Header 部分添加搜索框：

```tsx
// 状态
const [searchQuery, setSearchQuery] = useState('');

// 过滤函数
const filteredTabs = useMemo(() => {
  if (!searchQuery.trim()) return tabs;
  return tabs.filter(tab => 
    tab.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [tabs, searchQuery]);

// JSX - 在 header 的 button 组之前添加：
<div className="relative mb-3">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
  <input
    type="text"
    placeholder="Search tabs..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full pl-9 pr-8 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
  />
  {searchQuery && (
    <button onClick={() => setSearchQuery('')}>
      <X className="w-4 h-4" />
    </button>
  )}
</div>

// 当搜索结果有内容时显示操作栏：
{searchQuery && filteredTabs.length > 0 && (
  <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
    <span>Found {filteredTabs.length} tabs</span>
    <div className="flex gap-2">
      <button onClick={handleSearchGroup}>Group</button>
      <button onClick={handleSearchSave}>Save</button>
      <button onClick={handleSearchClose}>Close</button>
    </div>
  </div>
)}
```

### 2. 同步验证功能

在 Footer 添加同步状态：

```tsx
const [syncStatus, setSyncStatus] = useState({
  connected: false,
  userId: null,
  deviceId: null
});

useEffect(() => {
  const checkStatus = async () => {
    const response = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
    if (response?.success) {
      setSyncStatus({
        connected: response.connected,
        userId: response.userId,
        deviceId: response.deviceId
      });
    }
  };
  checkStatus();
  const interval = setInterval(checkStatus, 5000);
  return () => clearInterval(interval);
}, []);

// 在 Footer 显示：
<footer>
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${syncStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
    <span className="text-xs">
      {syncStatus.connected ? 'Synced' : 'Not synced'}
    </span>
  </div>
</footer>
```

### 3. 搜索结果高亮

```tsx
function HighlightText({ text, searchTerm }) {
  if (!searchTerm) return text;
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <span key={i} className="bg-yellow-200">{part}</span>
    ) : part
  );
}
```

## 确认数据同步的方法

1. **Popup 查看状态**: Footer 显示同步状态（绿点/红点）
2. **Chrome Console**: 打开 Background Console 查看日志 `[FirebaseSync] Tabs synced: X`
3. **Firebase Console**: 打开 https://console.firebase.google.com/project/drop-the-tabs/firestore
4. **查看集合**: `users/{userId}/sync/` 应该有数据

## 快速测试

修改完成后：
1. `bun run dev:extension`
2. 加载到 Chrome
3. 打开任意网站创建几个 tabs
4. 查看 Firebase Console 是否有数据
