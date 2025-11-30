(function(window, document) {
  const config = window.AgentChatConfig || {};
  const agentId = config.agentId;
  const scriptSrc = document.currentScript.src;
  const domain = new URL(scriptSrc).origin;
  
  if (!agentId) {
    console.error("AgentChat: agentId is missing.");
    return;
  }

  // Create Container
  const container = document.createElement('div');
  container.id = 'agent-chat-container';
  container.style.position = 'fixed';
  container.style.bottom = '100px';
  container.style.right = '20px';
  container.style.zIndex = '2147483647'; // Max z-index
  container.style.width = '380px';
  container.style.height = '600px';
  container.style.maxHeight = 'calc(100vh - 120px)';
  container.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
  container.style.borderRadius = '16px';
  container.style.overflow = 'hidden';
  container.style.display = 'none'; // Hidden by default
  container.style.transition = 'all 0.3s ease-in-out';
  container.style.opacity = '0';
  container.style.transform = 'translateY(20px)';

  // Create Toggle Button (The Bubble)
  const button = document.createElement('div');
  button.id = 'agent-chat-button';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = config.color || '#2563eb';
  button.style.cursor = 'pointer';
  button.style.zIndex = '2147483647';
  button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.transition = 'transform 0.2s ease';

  // Chat Icon SVG
  const chatIcon = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;

  // Close Icon SVG
  const closeIcon = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  button.innerHTML = chatIcon;

  let isOpen = false;

  button.onclick = function() {
      isOpen = !isOpen;
      if (isOpen) {
          container.style.display = 'block';
          // Small delay to allow display:block to apply before transition
          setTimeout(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
          }, 10);
          button.innerHTML = closeIcon;
          button.style.transform = 'rotate(90deg)';
      } else {
          container.style.opacity = '0';
          container.style.transform = 'translateY(20px)';
          setTimeout(() => {
            container.style.display = 'none';
          }, 300);
          button.innerHTML = chatIcon;
          button.style.transform = 'rotate(0deg)';
      }
  };

  // Create Iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${domain}/embed/${agentId}`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.allow = "clipboard-write"; // Allow clipboard access

  container.appendChild(iframe);
  document.body.appendChild(container);
  document.body.appendChild(button);

})(window, document);

