# Simplified Integration Plan - Use Weaver Naming

## Why This Makes Sense

You're bringing in **40+ functions from Weaver** vs only **~15 existing in MCP server**. It's simpler to adopt the Weaver naming convention entirely.

## Simple Changes Needed

### 1. Update Environment Variables (One-time change)

**Current MCP:**

```bash
PROXMOX_TOKEN_NAME=your-token
PROXMOX_TOKEN_VALUE=your-secret
```

**Change to Weaver naming:**

```bash
PROXMOX_TOKEN_ID=your-token
PROXMOX_TOKEN_SECRET=your-secret
```

### 2. Update mcp_server_stdio.py

Just change these 4 lines:

```python
# Line 43 - Change from:
self.token_name = os.getenv("PROXMOX_TOKEN_NAME")
# To:
self.token_name = os.getenv("PROXMOX_TOKEN_ID")

# Line 44 - Change from:
self.token_value = os.getenv("PROXMOX_TOKEN_VALUE")
# To:
self.token_value = os.getenv("PROXMOX_TOKEN_SECRET")

# Lines 51-54 - Update error message from:
"PROXMOX_HOST, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE"
# To:
"PROXMOX_HOST, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET"

# Lines 533-535 - Update help text from:
"  PROXMOX_TOKEN_NAME - Your API token name"
"  PROXMOX_TOKEN_VALUE - Your API token value"
# To:
"  PROXMOX_TOKEN_ID - Your API token ID"
"  PROXMOX_TOKEN_SECRET - Your API token secret"
```

### 3. Update .env.example

```bash
# Old
PROXMOX_TOKEN_NAME=your-token-name
PROXMOX_TOKEN_VALUE=your-token-value

# New
PROXMOX_TOKEN_ID=your-token-id
PROXMOX_TOKEN_SECRET=your-token-secret
```

### 4. Update README/Documentation

Change any references from TOKEN_NAME/TOKEN_VALUE to TOKEN_ID/TOKEN_SECRET

## Benefits of This Approach

✅ **Simpler** - No alias logic needed
✅ **Cleaner** - One naming convention throughout
✅ **Faster** - Just 4 line changes in the code
✅ **Consistent** - All 40+ new functions use same naming
✅ **Less Confusion** - One set of env vars to remember

## Integration Steps

1. **Step 1**: Update the 4 lines in mcp_server_stdio.py
2. **Step 2**: Copy functions from Weaver (they'll work as-is)
3. **Step 3**: Register new MCP tools
4. **Step 4**: Test and deploy

## Summary

Instead of maintaining backward compatibility with aliases, just adopt the Weaver naming since:

- You're adding 3x more functions from Weaver than exist in MCP
- It's a one-time change to env vars
- Much simpler implementation
- No compatibility layer needed

This is definitely the quickest approach! 🚀
