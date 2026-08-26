import json
import os


def _get_firebase_app():
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
    if service_account_json:
        service_account = json.loads(service_account_json)
    else:
        service_account = {
            'type': 'service_account',
            'project_id': os.getenv('FIREBASE_PROJECT_ID'),
            'private_key': os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
            'client_email': os.getenv('FIREBASE_CLIENT_EMAIL'),
        }

    if not service_account.get('project_id') or not service_account.get('private_key') or not service_account.get('client_email'):
        raise RuntimeError('Firebase Admin credentials are not configured')

    return firebase_admin.initialize_app(credentials.Certificate(service_account))


def verify_id_token(id_token: str):
    from firebase_admin import auth

    return auth.verify_id_token(id_token, app=_get_firebase_app())