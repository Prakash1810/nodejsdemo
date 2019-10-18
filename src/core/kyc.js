require('dotenv').config();
const { RequestBuilder, Payload } = require('yoti');
const CLIENT_SDK_ID = process.env.CLIENT_SDK_ID;
const ENDPOINT = process.env.ENDPOINT;
const SUCCESS_URL = process.env.SUCCESS_URL;
const ERROR_URL = process.env.ERROR_URL;
const YOTI_BASE_URL = process.env.YOTI_BASE_URL;
class kyc{
    
    async init(userID,auth_token) {

        const SessionObj = {
            "client_session_token_ttl": 600,
            "resources_ttl": 604800,
            "user_tracking_id": userID,
            "notifications": {
              "endpoint": ENDPOINT,
              "topics": [
                "resource_update",
                "task_completion",
                "check_completion",
                "session_completion"
              ],
              "auth_token":auth_token
            },
            "requested_checks": [
              {
                "type": "ID_DOCUMENT_AUTHENTICITY",
                "config": {}
              },
            ],
            "requested_tasks": [
              {
                "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                "config": {
                  "manual_check": "FALLBACK"
                }
              }
            ],
            "sdk_config": {
              "allowed_capture_methods": "CAMERA_AND_UPLOAD",
              "primary_colour": "#2d9fff",
              "preset_issuing_country": "Estonia",
              "success_url": SUCCESS_URL,
              "error_url": ERROR_URL
            }
          };
        
        const request = new RequestBuilder()
            .withBaseUrl(YOTI_BASE_URL)
            .withPemFilePath(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem')
            .withEndpoint('/sessions')
            .withPayload(new Payload(SessionObj))
            .withMethod('POST')
            .withQueryParam('sdkId', CLIENT_SDK_ID)
            .build();
        
        //get Yoti response

        const response = await request.execute();
        return response;
    }
}

module.exports = new kyc();


