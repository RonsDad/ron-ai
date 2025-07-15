# Browser-Use Anti-Detection Configuration

This document outlines all anti-detection features configured in our browser-use implementation.

## Core Anti-Detection Features

### 1. Stealth Mode (`stealth=True`)
- Uses **Patchright** instead of Playwright
- Patchright is a Playwright fork that modifies browser signatures at kernel level
- Achieves 67% reduction in headless detection

### 2. Headful Mode (`headless=False`)
- Runs browser in windowed mode instead of headless
- Headless mode is easily detectable by anti-bot systems
- Combined with stealth mode for maximum effectiveness

### 3. Browser Identity Spoofing
```python
user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
locale="en-US"
timezone_id="America/New_York"
```

### 4. Display Configuration
```python
viewport={'width': 1920, 'height': 1080}
window_size={'width': 1920, 'height': 1080}
device_scale_factor=1.0
is_mobile=False
```

### 5. Persistent Browser Profile
```python
user_data_dir="./browser_profile"
keep_alive=True
```
- Maintains cookies and browser state between sessions
- Makes browser appear more "human" with history and stored data

### 6. Chrome Launch Arguments
Key anti-detection arguments:
- `--disable-blink-features=AutomationControlled` - Removes automation flags
- `--disable-features=IsolateOrigins,site-per-process` - Prevents site isolation
- `--enable-features=NetworkService,NetworkServiceInProcess` - Network service features
- `--disable-background-timer-throttling` - Prevents background throttling
- `--password-store=basic` - Uses basic password store

### 7. Permissions
```python
permissions=['clipboard-read', 'clipboard-write', 'notifications', 'geolocation']
```
- Grants common permissions to appear more like a regular browser

### 8. Security Settings
```python
disable_security=False  # Keep security features enabled
ignore_https_errors=False  # Don't ignore HTTPS errors
```
- Maintains normal browser security behavior

### 9. Timing Configurations
```python
minimum_wait_page_load_time=0.25
wait_for_network_idle_page_load_time=0.5
maximum_wait_page_load_time=5.0
```
- Human-like page load waiting times

## Optional Features

### Proxy Support (Commented Out)
```python
proxy={
    'server': 'http://proxy-server:8080',
    'username': 'user',
    'password': 'pass'
}
```
- Can be enabled for IP rotation
- Residential proxies recommended for maximum stealth

## Best Practices

1. **Always use headful mode** when stealth is critical
2. **Maintain persistent user data directory** for cookie/state persistence  
3. **Use residential proxies** for sites with advanced protection
4. **Add realistic delays** between actions (handled by browser-use)
5. **Rotate user agents and fingerprints** for large-scale operations

## Effectiveness

Based on browser-use research:
- **Patchright (stealth=True)**: 67% reduction in detection
- **Headful mode**: 0% headless detection when combined with virtual displays
- **Combined approach**: Significantly reduces captcha encounters

## Testing Anti-Detection

To test effectiveness, visit:
- https://bot.sannysoft.com/
- https://abrahamjuliot.github.io/creepjs/
- https://nowsecure.nl/

These sites will show what bot-detection signals your browser is exposing. 