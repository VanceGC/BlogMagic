<?php
if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="notice notice-info">
        <p><strong>Quick Setup Guide:</strong></p>
        <ol>
            <li>Copy the <strong>Webhook URL</strong> below</li>
            <li>Create an <strong>Application Password</strong> (see instructions below)</li>
            <li>Enter both in your BlogMagic platform's blog configuration</li>
            <li>That's it! Your platform will automatically send posts to WordPress</li>
        </ol>
    </div>
    
    <form method="post" action="options.php">
        <?php
        settings_fields('ai_blog_automation_settings');
        do_settings_sections('ai_blog_automation_settings');
        ?>
        
        <h2>WordPress Configuration</h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_api_key">Webhook API Key (Optional)</label>
                </th>
                <td>
                    <input type="password" 
                           id="ai_blog_automation_api_key" 
                           name="ai_blog_automation_api_key" 
                           value="<?php echo esc_attr(get_option('ai_blog_automation_api_key')); ?>" 
                           class="regular-text"
                           placeholder="Leave empty for no authentication">
                    <p class="description">Optional: Add an API key to secure webhook requests. If set, include this in your platform configuration.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_default_category">Default Category</label>
                </th>
                <td>
                    <?php
                    wp_dropdown_categories(array(
                        'name' => 'ai_blog_automation_default_category',
                        'id' => 'ai_blog_automation_default_category',
                        'selected' => get_option('ai_blog_automation_default_category', 1),
                        'hide_empty' => false,
                        'hierarchical' => true,
                    ));
                    ?>
                    <p class="description">Default category for AI-generated posts.</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="ai_blog_automation_default_author">Default Author</label>
                </th>
                <td>
                    <?php
                    wp_dropdown_users(array(
                        'name' => 'ai_blog_automation_default_author',
                        'id' => 'ai_blog_automation_default_author',
                        'selected' => get_option('ai_blog_automation_default_author', 1),
                        'who' => 'authors',
                    ));
                    ?>
                    <p class="description">Default author for AI-generated posts.</p>
                </td>
            </tr>
        </table>
        
        <?php submit_button('Save Settings'); ?>
    </form>
    
    <hr>
    
    <h2>Integration Information</h2>
    <p>Copy these values and enter them in your AI Blog Automation platform's blog configuration.</p>
    
    <table class="form-table">
        <tr>
            <th scope="row">
                <label>Webhook URL</label>
            </th>
            <td>
                <input type="text" 
                       id="webhook-url"
                       value="<?php echo esc_url(rest_url('ai-blog-automation/v1/webhook')); ?>" 
                       class="large-text" 
                       readonly
                       style="font-family: monospace; background: #f5f5f5;">
                <button type="button" class="button" onclick="copyToClipboard('webhook-url')">
                    Copy
                </button>
                <p class="description">
                    <strong>Enter this URL in your BlogMagic platform's blog configuration under "WordPress URL"</strong>
                </p>
            </td>
        </tr>
        
        <tr>
            <th scope="row">
                <label>Application Password</label>
            </th>
            <td>
                <div class="notice notice-warning inline" style="margin: 0 0 10px 0; padding: 10px;">
                    <p style="margin: 0;"><strong>⚠️ Important:</strong> You need to create an Application Password to allow the platform to publish posts.</p>
                </div>
                <p class="description" style="line-height: 1.8;">
                    <strong>Steps to create an Application Password:</strong><br>
                    1. Go to <a href="<?php echo admin_url('profile.php'); ?>" target="_blank">Users → Profile</a><br>
                    2. Scroll down to the "Application Passwords" section<br>
                    3. Enter a name: <code>BlogMagic</code><br>
                    4. Click "Add New Application Password"<br>
                    5. <strong>Copy the generated password</strong> (it will only be shown once!)<br>
                    6. Enter this password in your BlogMagic platform's blog configuration under "WordPress App Password"
                </p>
            </td>
        </tr>
    </table>
    
    <hr>
    
    <h2>How It Works</h2>
    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #2271b1; margin: 20px 0;">
        <p><strong>Post Publishing Flow:</strong></p>
        <ol style="margin-left: 20px;">
            <li>Your BlogMagic platform generates a blog post</li>
            <li>The platform sends the post to your WordPress site via the webhook URL</li>
            <li>WordPress receives the post and creates it automatically</li>
            <li><strong>Auto-Publish setting:</strong> Controlled in your platform's blog configuration, not here
                <ul style="margin-left: 20px; margin-top: 5px;">
                    <li>If enabled in platform: Posts are published immediately</li>
                    <li>If disabled in platform: Posts are saved as drafts for review</li>
                </ul>
            </li>
        </ol>
        <p style="margin-top: 15px;"><strong>Note:</strong> The Auto-Publish behavior is determined by your BlogMagic platform settings, not by this WordPress plugin. This ensures centralized control of all your blogs from one place.</p>
    </div>
    
    <hr>
    
    <h2>Test Connection</h2>
    <p>Verify that the webhook endpoint is working correctly.</p>
    <button type="button" class="button button-primary" id="test-connection">Test Webhook Connection</button>
    <div id="test-result" style="margin-top: 10px;"></div>
</div>

<script>
function copyToClipboard(elementId) {
    var element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    var button = event.target;
    var originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#00a32a';
    button.style.color = 'white';
    
    setTimeout(function() {
        button.textContent = originalText;
        button.style.background = '';
        button.style.color = '';
    }, 2000);
}

jQuery(document).ready(function($) {
    $('#test-connection').on('click', function() {
        var button = $(this);
        var resultDiv = $('#test-result');
        
        button.prop('disabled', true).text('Testing...');
        resultDiv.html('<p>Testing webhook endpoint...</p>');
        
        $.ajax({
            url: '<?php echo rest_url('ai-blog-automation/v1/test'); ?>',
            method: 'GET',
            beforeSend: function(xhr) {
                var apiKey = $('#ai_blog_automation_api_key').val();
                if (apiKey) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + apiKey);
                }
            },
            success: function(response) {
                resultDiv.html(
                    '<div class="notice notice-success" style="padding: 10px;">' +
                    '<p style="margin: 0;"><strong>✓ Connection Successful!</strong></p>' +
                    '<p style="margin: 5px 0 0 0;">WordPress Version: ' + response.wordpress_version + ' | Plugin Version: ' + response.plugin_version + '</p>' +
                    '</div>'
                );
            },
            error: function(xhr) {
                var errorMsg = xhr.responseJSON?.message || 'Unknown error';
                resultDiv.html(
                    '<div class="notice notice-error" style="padding: 10px;">' +
                    '<p style="margin: 0;"><strong>✗ Connection Failed</strong></p>' +
                    '<p style="margin: 5px 0 0 0;">Error: ' + errorMsg + '</p>' +
                    '</div>'
                );
            },
            complete: function() {
                button.prop('disabled', false).text('Test Webhook Connection');
            }
        });
    });
});
</script>

<style>
.form-table th {
    width: 200px;
}
.notice.inline {
    display: block;
    margin: 5px 0 15px 0;
}
code {
    background: #f0f0f1;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
}
</style>

