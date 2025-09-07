# WPlacer - Modular Pixel Art Placement Tool

A refactored, modular version of WPlacer - an automated pixel art placement tool for collaborative canvas projects like r/place.

## 🚀 What's New in v5.4.0

This version represents a complete architectural refactor with the following improvements:

### ✨ Key Features
- **Modular Backend Architecture**: Clean separation of concerns with dedicated services
- **Enhanced Pawtect Integration**: Improved security and token management
- **Component-Based Frontend**: Modern, maintainable UI components
- **Restructured Browser Extension**: Better organization and reliability
- **Improved Error Handling**: Comprehensive error management system
- **Real-time Updates**: WebSocket-based live logging and status updates

## 📁 Project Structure

```
wplacer/
├── src/                          # Backend Node.js modules
│   ├── config/
│   │   ├── constants.js         # All constants (URLs, timeouts, etc.)
│   │   ├── settings.js          # Settings management
│   │   └── environment.js       # Environment variables
│   ├── core/
│   │   ├── wplacer-client.js    # WPlacer HTTP client class
│   │   ├── template-manager.js  # Template processing logic
│   │   ├── token-manager.js     # Token management
│   │   └── charge-cache.js      # User charge system
│   ├── utils/
│   │   ├── logger.js           # Logging system
│   │   ├── file-ops.js         # File operations
│   │   ├── codec.js            # Template compression
│   │   ├── palette.js          # Color management
│   │   ├── network.js          # Network utilities
│   │   └── time.js             # Time/duration helpers
│   ├── services/
│   │   ├── proxy-service.js    # Proxy management
│   │   ├── user-service.js     # User operations
│   │   ├── template-service.js # Template operations
│   │   ├── keep-alive.js       # Session maintenance
│   │   ├── queue-processor.js  # Template queue
│   │   └── pawtect-service.js  # Pawtect integration
│   ├── api/
│   │   ├── routes/
│   │   │   ├── index.js        # Route aggregation
│   │   │   ├── users.js        # User endpoints
│   │   │   ├── templates.js    # Template endpoints
│   │   │   ├── settings.js     # Settings endpoints
│   │   │   ├── colors.js       # Color ordering
│   │   │   └── system.js       # System/logs endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js         # Authentication
│   │   │   ├── validation.js   # Input validation
│   │   │   └── error-handler.js # Error handling
│   │   └── websocket/
│   │       └── log-streamer.js # WebSocket logs
│   ├── models/
│   │   ├── user.js             # User model
│   │   ├── template.js         # Template model
│   │   └── settings.js         # Settings model
│   ├── errors/
│   │   ├── base-error.js       # Base error class
│   │   ├── network-error.js    # Network errors
│   │   └── suspension-error.js # Suspension errors
│   └── server.js               # Main server entry point

├── client/                       # Frontend modules
│   ├── js/
│   │   ├── components/         # UI Components
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   ├── modals/         # Modal components
│   │   │   ├── editors/        # Editor components
│   │   │   └── shared/         # Shared components
│   │   ├── services/
│   │   │   ├── api-client.js   # Backend API wrapper
│   │   │   └── websocket.js    # WebSocket management
│   │   ├── utils/
│   │   │   ├── dom.js          # DOM helpers
│   │   │   └── validation.js   # Form validation
│   │   └── app.js              # Main application entry
│   ├── css/                    # Stylesheets
│   └── assets/                 # Static assets

├── extension/                    # Browser extension (reorganized)
│   ├── src/
│   │   ├── background/
│   │   │   └── service-worker.js
│   │   ├── content/
│   │   │   └── content-script.js
│   │   ├── popup/
│   │   │   ├── popup.js
│   │   │   ├── popup.html
│   │   │   └── popup.css
│   │   └── shared/
│   │       ├── constants.js
│   │       └── utils.js
│   ├── icons/                  # Extension icons
│   ├── pawtect_inject.js       # Pawtect injection script
│   └── manifest.json

├── public/                       # Static files (reorganized)
│   ├── index.html
│   ├── favicon.ico
│   └── assets/                # Combined assets

├── data/                         # Keep existing data structure
├── python_solver/               # Python API server
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

### Backend Setup
```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-reload
npm run dev
```

### Browser Extension Setup
1. Open Chrome/Edge and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `extension/` directory
4. The extension will be loaded and ready to use

### Frontend Development
The frontend is now modular and uses ES6 modules. The main entry point is `client/js/app.js`.

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
PORT=80
NODE_ENV=production
```

### Extension Settings
The extension automatically detects the WPlacer server on `127.0.0.1:80`. You can modify the port in the extension popup if needed.

## 🚀 New Features

### Enhanced Pawtect Integration
- Dedicated `PawtectService` for token management
- Improved security and reliability
- Better error handling and logging

### Modular Frontend
- Component-based architecture
- Real-time WebSocket updates
- Improved user experience
- Better error handling and notifications

### Restructured Extension
- Manifest V3 compliance
- Better organization and maintainability
- Improved token capture reliability
- Enhanced popup interface

### API Improvements
- RESTful API design
- Comprehensive error handling
- Input validation middleware
- Rate limiting and security

## 📊 API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Add new user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/status/:id` - Check user status

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/import` - Import template

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### System
- `GET /api/system/token-needed` - Check if token needed
- `POST /api/system/token` - Submit token
- `GET /api/system/pawtect-status` - Get pawtect status
- `GET /api/system/logs` - Get logs
- `GET /api/system/errors` - Get error logs

## 🔄 Migration from v5.3.0

The refactored version maintains full compatibility with existing data files:
- `data/users.json` - User data
- `data/templates.json` - Template data
- `data/settings.json` - Settings
- `data/color_ordering.json` - Color ordering
- `data/proxies.txt` - Proxy list

No manual migration is required - the system will automatically load and use existing data.

## 🐛 Troubleshooting

### Common Issues

1. **Extension not capturing tokens**
   - Ensure the extension is loaded and enabled
   - Check that you're on `wplace.live`
   - Verify the WPlacer server is running

2. **Server connection issues**
   - Check if the server is running on the correct port
   - Verify firewall settings
   - Check browser console for errors

3. **Template import/export issues**
   - Ensure share codes are valid
   - Check template dimensions and data format
   - Verify color palette compatibility

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the AGPL-3.0-only License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original WPlacer by luluwaffless and JinxTheCatto
- Community contributors and testers
- r/place community for inspiration

## 📞 Support

- GitHub Issues: [Report bugs and request features](https://github.com/luluwaffless/wplacer/issues)
- Documentation: Check the wiki for detailed guides
- Community: Join our Discord for support and discussions

---

**Note**: This is a refactored version of WPlacer with improved architecture and maintainability. All core functionality remains the same while providing a better development experience and more reliable operation.
**Note**: I DO NOT GUARANTEE THAT THIS WORK LMAO
