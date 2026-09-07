"""Offline UI integration tests; no production requests or credentials.

The sandbox browser disallows navigation, so compiled modules are repackaged
in a TEST-ONLY CommonJS harness. This tests DOM interactions and API contracts,
not deployment, CSP/CORS, or the live backend. See README for live smoke tests.
"""
from pathlib import Path
import json
import os
import shutil
import subprocess
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
subprocess.run(['node', 'tests/browser-bundle.mjs'], cwd=ROOT, check=True)
CSS = (ROOT / 'public/styles.css').read_text()
FIXTURES = (ROOT / 'tests/browser-fixtures.js').read_text()
BUNDLE = (ROOT / 'artifacts/browser-bundle.js').read_text()
RESULTS = []


def boot(browser, authenticated=True, width=1440, height=1000):
    page = browser.new_page(viewport={'width': width, 'height': height})
    page.set_default_timeout(4000)
    page.emulate_media(reduced_motion='reduce')
    page.errors = []
    page.on('pageerror', lambda error: page.errors.append(str(error)))
    page.set_content('<html><head></head><body><div id="app"></div><div id="toasts" role="status"></div></body></html>')
    page.add_style_tag(content=CSS)
    page.add_script_tag(content=FIXTURES)
    page.add_script_tag(content=BUNDLE)
    expect(page.locator('input[name=email]')).to_be_visible()
    if authenticated:
        sign_in(page)
    return page


def sign_in(page):
    page.locator('[name=email]').fill('admin@example.test')
    page.locator('[name=password]').fill('FixtureOnly-123')
    page.get_by_role('button', name='Sign in', exact=True).click()
    expect(page.get_by_role('heading', name='Dashboard', exact=True)).to_be_visible()
    expect(page.locator('.metric-card')).to_have_count(4)


def go(page, route, heading):
    page.evaluate('(route) => location.hash = "#/" + route', route)
    expect(page.get_by_role('heading', name=heading, exact=True).first).to_be_visible()


def check(name, run, browser):
    page = boot(browser, authenticated=name != 'admin login gate')
    try:
        run(page)
        assert not page.errors, page.errors
        RESULTS.append({'name': name, 'passed': True})
        print('PASS', name)
    except Exception:
        page.screenshot(path=str(ROOT / 'artifacts/failure.png'), full_page=True)
        raise
    finally:
        page.close()


def login_gate(p):
    p.screenshot(path=str(ROOT / 'artifacts/login.png'), full_page=True)
    p.evaluate('fixture.admin.role = "Customer"')
    p.locator('[name=email]').fill('admin@example.test')
    p.locator('[name=password]').fill('FixtureOnly-123')
    p.get_by_role('button', name='Sign in', exact=True).click()
    expect(p.get_by_role('note').filter(has_text='active Admin')).to_have_count(0)  # error uses role=alert
    expect(p.locator('.notice').filter(has_text='active Admin')).to_be_visible()
    assert p.evaluate('fixture.requests.filter(r=>r.path.startsWith("/admin/")).length') == 0
    p.evaluate('fixture.admin.role = "Admin"')
    sign_in(p)
    assert p.evaluate('sessionStorage.getItem("agentic-admin-session")').find('refreshToken') == -1
    p.screenshot(path=str(ROOT / 'artifacts/dashboard.png'), full_page=True)


def building_crud(p):
    go(p, 'buildings', 'Buildings')
    p.get_by_role('button', name='Add building', exact=True).click()
    d = p.get_by_role('dialog')
    d.locator('[name=name]').fill('New Hall')
    d.locator('[name=content]').fill('A test-only building')
    d.locator('[name=latitude]').fill('0')
    d.locator('[name=longitude]').fill('106.6')
    d.get_by_role('button', name='Save changes').click()
    expect(p.get_by_role('link', name='New Hall', exact=True)).to_be_visible()
    payload = p.evaluate('fixture.requests.find(r=>r.method==="POST"&&r.path==="/buildings").body')
    assert payload['latitude'] == 0 and payload['userId'] == 'admin-1'
    row = p.get_by_role('row').filter(has_text='New Hall')
    row.get_by_role('button', name='Edit building').click()
    p.get_by_role('dialog').locator('[name=name]').fill('Updated Hall')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    row = p.get_by_role('row').filter(has_text='Updated Hall')
    expect(row).to_be_visible()
    row.get_by_role('button', name='Delete', exact=True).click()
    p.get_by_role('dialog').get_by_role('button', name='Cancel').click()
    assert p.evaluate('fixture.requests.filter(r=>r.method==="DELETE").length') == 0
    row.get_by_role('button', name='Delete', exact=True).click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.get_by_role('link', name='Updated Hall', exact=True)).to_have_count(0)


def user_management(p):
    go(p, 'users', 'Users')
    expect(p.locator('tbody tr')).to_have_count(20)
    p.get_by_role('button', name='Next', exact=True).click()
    expect(p.get_by_text('Page 2 / 3', exact=True)).to_be_visible()
    go(p, 'users/user-1', 'User details')
    p.get_by_role('button', name='Edit user').click()
    p.get_by_role('dialog').locator('[name=name]').fill('Edited Student')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    expect(p.get_by_role('heading', name='Edited Student')).to_be_visible()
    p.get_by_role('button', name='Disable account').click()
    p.get_by_role('dialog').get_by_role('button', name='Continue').click()
    expect(p.get_by_text('Disabled', exact=True)).to_be_visible()
    p.get_by_role('button', name='Enable account').click()
    p.get_by_role('dialog').get_by_role('button', name='Continue').click()
    expect(p.get_by_text('Active', exact=True)).to_be_visible()
    go(p, 'users/admin-1', 'User details')
    expect(p.get_by_role('button', name='Disable account')).to_be_disabled()
    p.get_by_role('button', name='Edit user').click()
    expect(p.get_by_role('dialog').locator('[name=role]')).to_be_disabled()
    p.get_by_role('dialog').get_by_role('button', name='Cancel').click()


def role_confirmation(p):
    go(p, 'users/user-1', 'User details')
    p.get_by_role('button', name='Edit user').click()
    p.get_by_role('dialog').locator('[name=role]').select_option('Employee')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    p.get_by_role('dialog', name='Change role?').get_by_role('button', name='Cancel').click()
    assert p.evaluate('fixture.requests.filter(r=>r.method==="PUT").length') == 0
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    p.get_by_role('dialog', name='Change role?').get_by_role('button', name='Continue').click()
    expect(p.locator('.badge').filter(has_text='Employee')).to_be_visible()


def question_answer(p):
    go(p, 'questions', 'Questions')
    p.get_by_role('link', name='Where is the B9 laboratory?', exact=True).click()
    expect(p.get_by_role('heading', name='Question details', exact=True)).to_be_visible()
    p.get_by_role('button', name='Add answer', exact=True).click()
    p.get_by_role('dialog').locator('[name=content]').fill('The laboratory is on the first floor.')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    expect(p.get_by_text('The laboratory is on the first floor.', exact=True)).to_be_visible()
    body = p.evaluate('fixture.requests.find(r=>r.method==="POST"&&r.path==="/contacts/answers").body')
    assert body['questionId'] == 'q-1' and 'createdDate' in body and 'createDate' not in body
    p.get_by_role('button', name='Edit answer').click()
    p.get_by_role('dialog').locator('[name=content]').fill('Updated answer')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    expect(p.get_by_text('Updated answer', exact=True)).to_be_visible()
    p.locator('.answer-card').get_by_role('button', name='Delete', exact=True).click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.get_by_role('heading', name='No answers yet')).to_be_visible()


def category_crud(p):
    go(p, 'categories', 'Categories')
    p.get_by_role('button', name='Add category').click()
    p.get_by_role('dialog').locator('[name=name]').fill('Test category')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    row = p.get_by_role('row').filter(has_text='Test category')
    expect(row).to_be_visible()
    row.get_by_role('button', name='Edit category').click()
    p.get_by_role('dialog').locator('[name=name]').fill('Renamed category')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    row = p.get_by_role('row').filter(has_text='Renamed category')
    row.get_by_role('button', name='Delete', exact=True).click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.get_by_text('Renamed category', exact=True)).to_have_count(0)


def chat_read_delete(p):
    go(p, 'chats', 'Chat histories')
    expect(p.get_by_role('link', name='Finding the B9 laboratory', exact=True)).to_be_visible()
    p.get_by_role('link', name='Finding the B9 laboratory', exact=True).click()
    expect(p.get_by_text('Follow the campus route to B9.', exact=True)).to_be_visible()
    p.locator('.message-card').first.get_by_role('button', name='Delete message').click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.locator('.message-card')).to_have_count(1)
    p.get_by_role('button', name='Delete conversation').click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.get_by_role('heading', name='Chat histories', exact=True)).to_be_visible()
    expect(p.get_by_role('heading', name='No records found')).to_be_visible()


def password_change(p):
    go(p, 'password', 'Change password')
    p.get_by_role('button', name='Send OTP', exact=True).click()
    assert p.evaluate('fixture.requests.some(r=>r.path==="/users/request-password-change"&&r.body.email==="admin@example.test")')
    p.locator('[name=otpCode]').fill('123456')
    p.locator('[name=oldPassword]').fill('OldFixture-123')
    p.locator('[name=newPassword]').fill('NewFixture-123')
    p.locator('[name=confirm]').fill('WrongFixture-123')
    p.get_by_role('button', name='Change password', exact=True).click()
    expect(p.get_by_text('The passwords do not match.', exact=True)).to_be_visible()
    assert not p.evaluate('fixture.requests.some(r=>r.path==="/users/change-password")')
    p.locator('[name=confirm]').fill('NewFixture-123')
    p.get_by_role('button', name='Change password', exact=True).click()
    expect(p.get_by_role('button', name='Sign in', exact=True)).to_be_visible()
    body = p.evaluate('fixture.requests.find(r=>r.path==="/users/change-password").body')
    assert set(body) == {'email', 'oldPassword', 'newPassword', 'otpCode'}
    assert p.evaluate('sessionStorage.getItem("agentic-admin-session")') is None


def api_error(p):
    p.evaluate('fixture.failPath="/buildings"; fixture.failStatus=500')
    go(p, 'buildings', 'Buildings')
    expect(p.get_by_text('The server could not complete this request. Please try again.', exact=True)).to_be_visible()
    assert 'Sensitive database details' not in p.locator('body').inner_text()
    p.evaluate('fixture.failPath=""')
    p.get_by_role('button', name='Retry', exact=True).click()
    expect(p.get_by_role('link', name='B9', exact=True)).to_be_visible()


def expiry(p):
    p.evaluate('fixture.failPath="/admin/users"; fixture.failStatus=401')
    p.evaluate('location.hash="#/users"')
    expect(p.get_by_role('button', name='Sign in', exact=True)).to_be_visible()
    expect(p.locator('.sidebar')).to_have_count(0)
    assert p.evaluate('sessionStorage.getItem("agentic-admin-session")') is None


def escaped_content(p):
    p.evaluate('fixture.questions[0].content="<img src=x onerror=alert(1)>"')
    go(p, 'questions/q-1', 'Question details')
    expect(p.locator('.question-content')).to_have_text('<img src=x onerror=alert(1)>')
    assert p.locator('.question-content img').count() == 0


def empty_and_filter(p):
    go(p, 'users', 'Users')
    p.locator('[name=isActive]').select_option('false')
    p.get_by_role('button', name='Apply filters').click()
    expect(p.get_by_role('heading', name='No records found')).to_be_visible()
    assert p.evaluate('fixture.requests.filter(r=>r.path==="/admin/users").at(-1).query.isActive') == 'false'


def profile_update(p):
    go(p, 'profile', 'Profile')
    p.get_by_role('button', name='Edit profile').click()
    p.get_by_role('dialog').locator('[name=name]').fill('New Admin Name')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    expect(p.get_by_role('heading', name='New Admin Name')).to_be_visible()
    body = p.evaluate('fixture.requests.find(r=>r.path==="/users/update-customer").body')
    assert 'role' not in body and 'email' not in body


def responsive(p):
    p.set_viewport_size({'width': 390, 'height': 844})
    assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
    p.get_by_role('button', name='Toggle navigation').click()
    expect(p.locator('.app-shell')).to_have_class('app-shell mobile-open')
    p.locator('.nav-link').filter(has_text='Users').click()
    expect(p.get_by_role('heading', name='Users', exact=True)).to_be_visible()
    assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
    p.screenshot(path=str(ROOT / 'artifacts/mobile-users.png'), full_page=True)
    p.set_viewport_size({'width': 1440, 'height': 1000})
    p.get_by_role('button', name='Toggle navigation').click()
    assert 'is-collapsed' in p.locator('.app-shell').get_attribute('class')


def logout(p):
    p.get_by_role('button', name='Logout').click()
    expect(p.get_by_role('button', name='Sign in', exact=True)).to_be_visible()
    p.evaluate('location.hash="#/users"')
    expect(p.get_by_role('button', name='Sign in', exact=True)).to_be_visible()
    assert p.evaluate('sessionStorage.getItem("agentic-admin-session")') is None


def question_crud(p):
    go(p, 'questions', 'Questions')
    p.get_by_role('button', name='Add question', exact=True).click()
    d = p.get_by_role('dialog')
    d.locator('[name=content]').fill('Question created by admin test')
    d.locator('[name=categoryId]').select_option('c-1')
    d.get_by_role('button', name='Save changes').click()
    row = p.get_by_role('row').filter(has_text='Question created by admin test')
    expect(row).to_be_visible()
    original = p.evaluate('fixture.requests.find(r=>r.method==="POST"&&r.path==="/contacts/questions").body')
    assert original['userId'] == 'admin-1' and original['createDate']
    row.get_by_role('button', name='Edit question').click()
    p.get_by_role('dialog').locator('[name=content]').fill('Edited question')
    p.get_by_role('dialog').get_by_role('button', name='Save changes').click()
    row = p.get_by_role('row').filter(has_text='Edited question')
    expect(row).to_be_visible()
    updated = p.evaluate('fixture.requests.filter(r=>r.method==="PUT"&&r.path.startsWith("/contacts/questions/")).at(-1).body')
    assert updated['createDate'] == original['createDate'] and updated['userId'] == original['userId']
    row.get_by_role('button', name='Delete', exact=True).click()
    p.get_by_role('dialog').get_by_role('button', name='Delete', exact=True).click()
    expect(p.get_by_role('link', name='Edited question', exact=True)).to_have_count(0)


def chat_filters(p):
    go(p, 'chats', 'Chat histories')
    p.locator('[name=userId]').fill('user-1')
    p.locator('[name=from]').fill('2026-09-01')
    p.locator('[name=to]').fill('2026-09-07')
    p.get_by_role('button', name='Apply filters').click()
    expect(p.get_by_role('link', name='Finding the B9 laboratory', exact=True)).to_be_visible()
    q = p.evaluate('fixture.requests.filter(r=>r.path==="/admin/chat/histories").at(-1).query')
    assert q['userId'] == 'user-1' and 'fromDate' in q and 'toDate' in q
    assert q['toDate'].endswith('999Z') and q['page'] == '1'
    p.locator('[name=from]').fill('2026-09-10')
    p.get_by_role('button', name='Apply filters').click()
    expect(p.get_by_role('alert')).to_contain_text('start date')


def vietnamese(p):
    p.locator('.language-picker select').select_option('vi')
    expect(p.get_by_role('heading', name='T\u1ed5ng quan', exact=True, level=1)).to_be_visible()
    expect(p.get_by_role('button', name='\u0110\u0103ng xu\u1ea5t', exact=True)).to_be_visible()
    assert p.evaluate('document.documentElement.lang') == 'vi'
    expect(p.locator('.metric-card')).to_have_count(4)
    p.screenshot(path=str(ROOT / 'artifacts/dashboard-vi.png'), full_page=True)
    p.locator('.language-picker select').select_option('en')
    expect(p.get_by_role('heading', name='Dashboard', exact=True)).to_be_visible()


with sync_playwright() as playwright:
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
    options = {'headless': True, 'args': ['--no-sandbox']}
    if executable:
        options['executable_path'] = executable
    browser = playwright.chromium.launch(**options)
    try:
        for name, scenario in [
            ('admin login gate', login_gate), ('building create edit delete and cancel', building_crud),
            ('user pagination edit status and self protection', user_management), ('role change requires confirmation', role_confirmation),
            ('question detail and answer CRUD payloads', question_answer), ('category CRUD', category_crud),
            ('chat timestamps ownership route and deletion', chat_read_delete), ('OTP password flow and validation', password_change),
            ('safe API error and retry', api_error), ('401 clears private data and session', expiry),
            ('API content is text not HTML', escaped_content), ('empty state and false status filter', empty_and_filter),
            ('self profile update excludes privileges', profile_update), ('mobile and collapsed navigation', responsive),
            ('logout protects direct routes', logout),
            ('question CRUD preserves author and timestamp', question_crud),
            ('chat server filters and date validation', chat_filters),
            ('Vietnamese and English interface', vietnamese),
        ]:
            check(name, scenario, browser)
    finally:
        browser.close()
(ROOT / 'artifacts/browser-results.json').write_text(json.dumps(RESULTS, indent=2) + '\n')
print(f'{len(RESULTS)} browser integration checks passed. APIs were fully mocked; no live backend was contacted.')
