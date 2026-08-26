import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get('http://127.0.0.1:8000/health')
        print('health:', r.status_code, r.json())

        reg = await client.post('http://127.0.0.1:8000/api/auth/register', json={"email":"tester3@example.com","password":"testpass"})
        print('register:', reg.status_code, reg.text)
        token = None
        if reg.status_code == 200:
            token = reg.json().get('access_token')
        else:
            # if already registered, login
            # auth.login expects JSON body with 'email' and 'password'
            login = await client.post('http://127.0.0.1:8000/api/auth/login', json={"email":"tester3@example.com","password":"testpass"})
            print('login:', login.status_code, login.text)
            if login.status_code == 200:
                token = login.json().get('access_token')

        files = {'files': ('test.jpg', b'\x89PNG\r\n\x1a\n', 'image/jpeg')}
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        resp = await client.post('http://127.0.0.1:8000/api/reports', data={'latitude':'12.34','longitude':'56.78','title':'Test'}, files=files, headers=headers)
        print('report:', resp.status_code, resp.text)

if __name__ == '__main__':
    asyncio.run(main())
