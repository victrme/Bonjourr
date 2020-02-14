const SETTINGSHTML = `<div><h5 class="trn">Quick Links</h5><div class="param"><div class="link_input_wrap"><input id="i_title" type="text" name="title" placeholder="Title"><input id="i_url" type="text" name="url" placeholder="URL"><p id="wrongURL" class="trn">Incorrect URL</p><button id="submitlink" class="trn centeredButton">Add Quick link</button><li class="help_sentence trn">Right click on the icons to Edit</li><li class="help_sentence trn">Drag and drop icons to rearrange</li></div><hr><div class="linknewtab wrapper"><span class="trn">Open in new tab by default</span><div><label class="switch"><input id="i_linknewtab" type="checkbox"><span class="slider round span"></span></label></div></div></div></div><div><h5 class="trn">Visuals</h5><div class="param"><div class="wrapper"><span class="trn selector_span">Background type</span><select id="i_type" class="theme"><option value="default" class="trn">Default</option><option value="dynamic" class="trn">Dynamic</option><option value="custom" class="trn">Custom</option></select></div><hr><div id="default"><div><div source="avi-richards-beach.jpg" class="imgpreview"><img src="/src/images/backgrounds/thumbnails/avi-richards-beach_mini.jpg"/></div><div source="tyler-casey-landscape.jpg" class="imgpreview"><img src="/src/images/backgrounds/thumbnails/tyler-casey-landscape_mini.jpg"/></div><div source="tahoe-beetschen-ferns.jpg" class="imgpreview"><img src="/src/images/backgrounds/thumbnails/tahoe-beetschen-ferns_mini.jpg"/></div><div source="ios13.jpg" class="imgpreview"><img src="/src/images/backgrounds/thumbnails/ios13_mini.jpg"/></div></div></div><div id="dynamic"><div class="wrapper"><span class="trn">Frequency</span><select id="i_freq"><option value="tabs" class="trn">Every tab</option><option value="hour" class="trn">Every hour</option><option value="day" class="trn">Every day</option><option value="pause" class="trn">Pause</option></select></div></div><hr><div class="blur"><span class="trn">Blur intensity</span><input id="i_blur" type="range" class="range" name="background_blur" min="0" max="50" value="25" step="1"></div><hr><div class="brightness"><span class="trn">Brightness</span><input id="i_bright" type="range" class="range" name="background_bright" min="0" max="1" value="1" step=".01"></div><hr><div class="darkmode wrapper"><span class="trn selector_span">Dark mode</span><select id="i_dark" class="theme"><option value="auto" class="trn">Only at night</option><option value="system" class="trn">With the system</option><option value="enable" class="trn">Enabled</option><option value="disable" class="trn">Disabled</option></select></div><hr><div class="distractions wrapper"><span class="trn">No distractions</span><div><label class="switch"><input id="i_distract" type="checkbox"><span class="slider round span"></span></label></div></div></div></div><div><h5 class="trn">Time & Date</h5><div class="param"><div id="w_ampm" class="12hour wrapper"><span class="trn">12-Hour Time</span><div><label class="switch"><input id="i_ampm" type="checkbox"><span class="slider round span"></span></label></div></div><hr><div class="wrapper"><span class="trn">US Date Format</span><div><label class="switch"><input id="i_usdate" type="checkbox"><span class="slider round span"></span></label></div></div><hr/><div class="wrapper"><span class="trn selector_span">Time zone</span><select id="i_timezone" class=""><option value="auto">Automatic</option><option value="-10">UTC/HST -10 (Honolulu)</option><option value="-9">UTC/AKST -9 (Ancorage)</option><option value="-8">UTC/PST -8 (Vancouver, Los Angeles)</option><option value="-7">UTC/MST -7 (Phoenix)</option><option value="-6">UTC/CST -6 (Mexico, Houston)</option><option value="-5">UTC/EST -5 (Montreal, New York, Panama)</option><option value="-4">UTC/AST -4 (Halifax, Caracas)</option><option value="-3">UTC/CLST -3 (Sao Paulo, Santiago)</option><option value="0">UTC/GMT (London, Lisboa, Reykjavik)</option><option value="+1">UTC/CET +1 (Paris, Madrid, Amsterdam, Stockholm)</option><option value="+2">UTC/EET +2 (Helsinki, Bucharest, Athens, Cairo)</option><option value="+3">UTC/MSK +3 (Moscow, Istanbul)</option><option value="+4">UTC/AST +4 (Tehran, Doha)</option><option value="+5">UTC/PKT +5 (Karachi)</option><option value="+6">UTC/IST +6 (Mumbai)</option><option value="+7">UTC/ICT +7 (Bangkok, Jakarta)</option><option value="+8">UTC/CST +8 (Shanghai, Perth)</option><option value="+9">UTC/KST +9 (Seoul, Tokyo)</option><option value="+10">UTC/AEST +10 (Brisbane)</option><option value="+11">UTC/AEDT +11 (Canberra)</option><option value="+12">UTC/NZDT +12 (Wellington)</option></select></div></div></div><div><h5 class="trn">Weather</h5><div class="param"><div class="w_auto wrapper"><span class="trn">Geolocation</span><div><label class="switch"><input id="i_geol" type="checkbox"><span class="slider round span"></span></label></div></div><div id="sett_city"><hr><div class="wrapper"><div><input id="i_city" type="text" name="city" placeholder="City"><select id="i_ccode" class="countrycode"><option value="AF">Afghanistan</option><option value="AX">Åland Islands</option><option value="AL">Albania</option><option value="DZ">Algeria</option><option value="AS">American Samoa</option><option value="AD">Andorra</option><option value="AO">Angola</option><option value="AI">Anguilla</option><option value="AQ">Antarctica</option><option value="AG">Antigua and Barbuda</option><option value="AR">Argentina</option><option value="AM">Armenia</option><option value="AW">Aruba</option><option value="AU">Australia</option><option value="AT">Austria</option><option value="AZ">Azerbaijan</option><option value="BS">Bahamas</option><option value="BH">Bahrain</option><option value="BD">Bangladesh</option><option value="BB">Barbados</option><option value="BY">Belarus</option><option value="BE">Belgium</option><option value="BZ">Belize</option><option value="BJ">Benin</option><option value="BM">Bermuda</option><option value="BT">Bhutan</option><option value="BO">Bolivia, Plurinational State of</option><option value="BQ">Bonaire, Sint Eustatius and Saba</option><option value="BA">Bosnia and Herzegovina</option><option value="BW">Botswana</option><option value="BV">Bouvet Island</option><option value="BR">Brazil</option><option value="IO">British Indian Ocean Territory</option><option value="BN">Brunei Darussalam</option><option value="BG">Bulgaria</option><option value="BF">Burkina Faso</option><option value="BI">Burundi</option><option value="KH">Cambodia</option><option value="CM">Cameroon</option><option value="CA">Canada</option><option value="CV">Cape Verde</option><option value="KY">Cayman Islands</option><option value="CF">Central African Republic</option><option value="TD">Chad</option><option value="CL">Chile</option><option value="CN">China</option><option value="CX">Christmas Island</option><option value="CC">Cocos (Keeling) Islands</option><option value="CO">Colombia</option><option value="KM">Comoros</option><option value="CG">Congo</option><option value="CD">Congo, the Democratic Republic of the</option><option value="CK">Cook Islands</option><option value="CR">Costa Rica</option><option value="CI">Côte d'Ivoire</option><option value="HR">Croatia</option><option value="CU">Cuba</option><option value="CW">Curaçao</option><option value="CY">Cyprus</option><option value="CZ">Czech Republic</option><option value="DK">Denmark</option><option value="DJ">Djibouti</option><option value="DM">Dominica</option><option value="DO">Dominican Republic</option><option value="EC">Ecuador</option><option value="EG">Egypt</option><option value="SV">El Salvador</option><option value="GQ">Equatorial Guinea</option><option value="ER">Eritrea</option><option value="EE">Estonia</option><option value="ET">Ethiopia</option><option value="FK">Falkland Islands (Malvinas)</option><option value="FO">Faroe Islands</option><option value="FJ">Fiji</option><option value="FI">Finland</option><option value="FR">France</option><option value="GF">French Guiana</option><option value="PF">French Polynesia</option><option value="TF">French Southern Territories</option><option value="GA">Gabon</option><option value="GM">Gambia</option><option value="GE">Georgia</option><option value="DE">Germany</option><option value="GH">Ghana</option><option value="GI">Gibraltar</option><option value="GR">Greece</option><option value="GL">Greenland</option><option value="GD">Grenada</option><option value="GP">Guadeloupe</option><option value="GU">Guam</option><option value="GT">Guatemala</option><option value="GG">Guernsey</option><option value="GN">Guinea</option><option value="GW">Guinea-Bissau</option><option value="GY">Guyana</option><option value="HT">Haiti</option><option value="HM">Heard Island and McDonald Islands</option><option value="VA">Holy See (Vatican City State)</option><option value="HN">Honduras</option><option value="HK">Hong Kong</option><option value="HU">Hungary</option><option value="IS">Iceland</option><option value="IN">India</option><option value="ID">Indonesia</option><option value="IR">Iran, Islamic Republic of</option><option value="IQ">Iraq</option><option value="IE">Ireland</option><option value="IM">Isle of Man</option><option value="IL">Israel</option><option value="IT">Italy</option><option value="JM">Jamaica</option><option value="JP">Japan</option><option value="JE">Jersey</option><option value="JO">Jordan</option><option value="KZ">Kazakhstan</option><option value="KE">Kenya</option><option value="KI">Kiribati</option><option value="KP">Korea, Democratic People's Republic of</option><option value="KR">Korea, Republic of</option><option value="KW">Kuwait</option><option value="KG">Kyrgyzstan</option><option value="LA">Lao People's Democratic Republic</option><option value="LV">Latvia</option><option value="LB">Lebanon</option><option value="LS">Lesotho</option><option value="LR">Liberia</option><option value="LY">Libya</option><option value="LI">Liechtenstein</option><option value="LT">Lithuania</option><option value="LU">Luxembourg</option><option value="MO">Macao</option><option value="MK">Macedonia, the Former Yugoslav Republic of</option><option value="MG">Madagascar</option><option value="MW">Malawi</option><option value="MY">Malaysia</option><option value="MV">Maldives</option><option value="ML">Mali</option><option value="MT">Malta</option><option value="MH">Marshall Islands</option><option value="MQ">Martinique</option><option value="MR">Mauritania</option><option value="MU">Mauritius</option><option value="YT">Mayotte</option><option value="MX">Mexico</option><option value="FM">Micronesia, Federated States of</option><option value="MD">Moldova, Republic of</option><option value="MC">Monaco</option><option value="MN">Mongolia</option><option value="ME">Montenegro</option><option value="MS">Montserrat</option><option value="MA">Morocco</option><option value="MZ">Mozambique</option><option value="MM">Myanmar</option><option value="NA">Namibia</option><option value="NR">Nauru</option><option value="NP">Nepal</option><option value="NL">Netherlands</option><option value="NC">New Caledonia</option><option value="NZ">New Zealand</option><option value="NI">Nicaragua</option><option value="NE">Niger</option><option value="NG">Nigeria</option><option value="NU">Niue</option><option value="NF">Norfolk Island</option><option value="MP">Northern Mariana Islands</option><option value="NO">Norway</option><option value="OM">Oman</option><option value="PK">Pakistan</option><option value="PW">Palau</option><option value="PS">Palestine, State of</option><option value="PA">Panama</option><option value="PG">Papua New Guinea</option><option value="PY">Paraguay</option><option value="PE">Peru</option><option value="PH">Philippines</option><option value="PN">Pitcairn</option><option value="PL">Poland</option><option value="PT">Portugal</option><option value="PR">Puerto Rico</option><option value="QA">Qatar</option><option value="RE">Réunion</option><option value="RO">Romania</option><option value="RU">Russian Federation</option><option value="RW">Rwanda</option><option value="BL">Saint Barthélemy</option><option value="SH">Saint Helena, Ascension and Tristan da Cunha</option><option value="KN">Saint Kitts and Nevis</option><option value="LC">Saint Lucia</option><option value="MF">Saint Martin (French part)</option><option value="PM">Saint Pierre and Miquelon</option><option value="VC">Saint Vincent and the Grenadines</option><option value="WS">Samoa</option><option value="SM">San Marino</option><option value="ST">Sao Tome and Principe</option><option value="SA">Saudi Arabia</option><option value="SN">Senegal</option><option value="RS">Serbia</option><option value="SC">Seychelles</option><option value="SL">Sierra Leone</option><option value="SG">Singapore</option><option value="SX">Sint Maarten (Dutch part)</option><option value="SK">Slovakia</option><option value="SI">Slovenia</option><option value="SB">Solomon Islands</option><option value="SO">Somalia</option><option value="ZA">South Africa</option><option value="GS">South Georgia and the South Sandwich Islands</option><option value="SS">South Sudan</option><option value="ES">Spain</option><option value="LK">Sri Lanka</option><option value="SD">Sudan</option><option value="SR">Suriname</option><option value="SJ">Svalbard and Jan Mayen</option><option value="SZ">Swaziland</option><option value="SE">Sweden</option><option value="CH">Switzerland</option><option value="SY">Syrian Arab Republic</option><option value="TW">Taiwan, Province of China</option><option value="TJ">Tajikistan</option><option value="TZ">Tanzania, United Republic of</option><option value="TH">Thailand</option><option value="TL">Timor-Leste</option><option value="TG">Togo</option><option value="TK">Tokelau</option><option value="TO">Tonga</option><option value="TT">Trinidad and Tobago</option><option value="TN">Tunisia</option><option value="TR">Turkey</option><option value="TM">Turkmenistan</option><option value="TC">Turks and Caicos Islands</option><option value="TV">Tuvalu</option><option value="UG">Uganda</option><option value="UA">Ukraine</option><option value="AE">United Arab Emirates</option><option value="GB">United Kingdom</option><option value="US">United States</option><option value="UM">United States Minor Outlying Islands</option><option value="UY">Uruguay</option><option value="UZ">Uzbekistan</option><option value="VU">Vanuatu</option><option value="VE">Venezuela, Bolivarian Republic of</option><option value="VN">Viet Nam</option><option value="VG">Virgin Islands, British</option><option value="VI">Virgin Islands, U.S.</option><option value="WF">Wallis and Futuna</option><option value="EH">Western Sahara</option><option value="YE">Yemen</option><option value="ZM">Zambia</option><option value="ZW">Zimbabwe</option></select></div><p id="wrongCity" class="trn wrongCity">There was a problem</p><button id="b_city" class="submitw_city centeredButton trn">Change city</button></div><p class="help_sentence trn">Use this option if you don't want to enable geolocation.</p></div><hr><div class="units wrapper"><span class="trn">Imperial units</span><div><label class="switch"><input id="i_units" type="checkbox"><span class="slider round span"></span></label></div></div></div></div><div><h5 class="trn">Search bar</h5><div class="param"><div class="activate_searchbar wrapper"><span class="trn">Enable</span><div><label class="switch"><input id="i_sb" type="checkbox"><span class="slider round span"></span></label></div></div><div id="choose_searchengine"><hr><div class="wrapper"><span class="trn">Search engine</span><select id="i_sbengine" class="choose_search"><option value="s_google">Google</option><option value="s_ddg">DuckDuckGo</option><option value="s_bing">Bing</option><option value="s_startpage">Startpage</option><option value="s_qwant">Qwant</option><option value="s_ecosia">Ecosia</option><option value="s_yahoo">Yahoo</option></select></div><div class="pro"><hr><div class="wrapper"><span class="trn">Parameters</span><input type="text" name="sbparams" id="i_sbparams" placeholder="&l=en"></div></div></div></div></div><div><h5 class="trn">General</h5><div class="param"><div class="choose_language wrapper"><span class="trn selector_span">Language</span><select id="i_lang" class="lang"><option value="en">English</option><option value="fr">Français</option><option value="sk">Slovenský</option><option value="sv">Svenska</option><option value="pl">Polski</option><option value="pt_BR">Português (Brasil)</option><option value="nl">Nederlandse</option><option value="ru">Русский</option><option value="zh_CN">简体中文</option><option value="de">Deutsch</option><option value="it">Italiano</option></select></div></div></div><div><h5 class="trn">Settings management</h5><div class="param"><div id="imp_wrapper" class="wrapper"><input id="i_import" type="text" name="Import" placeholder="Paste import code"><button id="submitImport" class="trn">Import</button></div><hr><div id="exp_wrapper" class="wrapper"><input readonly id="i_export" type="text" name="export" placeholder="Click to show export code"><button id="submitExport" class="trn">Export</button></div><hr><div id="reset_wrapper" class="wrapper"><button id="submitReset" class="trn">Reset settings</button></div></div></div><div class="signature"><div class="firstblock"><p class="version">Bonjourr <a href="https://bonjourr.fr/history">1.9.0</a></p><div class="socialIcons"><a href="https://bonjourr.fr" title="Bonjourr's website"><svg height="16px" id="Layer_1" style="enable-background:new 0 0 16 16;" version="1.1" viewBox="0 0 16 16" width="16px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M15.45,7L14,5.551V2c0-0.55-0.45-1-1-1h-1c-0.55,0-1,0.45-1,1v0.553L9,0.555C8.727,0.297,8.477,0,8,0S7.273,0.297,7,0.555 L0.55,7C0.238,7.325,0,7.562,0,8c0,0.563,0.432,1,1,1h1v6c0,0.55,0.45,1,1,1h3v-5c0-0.55,0.45-1,1-1h2c0.55,0,1,0.45,1,1v5h3 c0.55,0,1-0.45,1-1V9h1c0.568,0,1-0.437,1-1C16,7.562,15.762,7.325,15.45,7z"/></svg></a><a href="https://www.instagram.com/getBonjourr/" title="Check out our Instagram"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path style="fill:#007aff" d="M256,49.471c67.266,0,75.233.257,101.8,1.469,24.562,1.121,37.9,5.224,46.778,8.674a78.052,78.052,0,0,1,28.966,18.845,78.052,78.052,0,0,1,18.845,28.966c3.45,8.877,7.554,22.216,8.674,46.778,1.212,26.565,1.469,34.532,1.469,101.8s-0.257,75.233-1.469,101.8c-1.121,24.562-5.225,37.9-8.674,46.778a83.427,83.427,0,0,1-47.811,47.811c-8.877,3.45-22.216,7.554-46.778,8.674-26.56,1.212-34.527,1.469-101.8,1.469s-75.237-.257-101.8-1.469c-24.562-1.121-37.9-5.225-46.778-8.674a78.051,78.051,0,0,1-28.966-18.845,78.053,78.053,0,0,1-18.845-28.966c-3.45-8.877-7.554-22.216-8.674-46.778-1.212-26.564-1.469-34.532-1.469-101.8s0.257-75.233,1.469-101.8c1.121-24.562,5.224-37.9,8.674-46.778A78.052,78.052,0,0,1,78.458,78.458a78.053,78.053,0,0,1,28.966-18.845c8.877-3.45,22.216-7.554,46.778-8.674,26.565-1.212,34.532-1.469,101.8-1.469m0-45.391c-68.418,0-77,.29-103.866,1.516-26.815,1.224-45.127,5.482-61.151,11.71a123.488,123.488,0,0,0-44.62,29.057A123.488,123.488,0,0,0,17.3,90.982C11.077,107.007,6.819,125.319,5.6,152.134,4.369,179,4.079,187.582,4.079,256S4.369,333,5.6,359.866c1.224,26.815,5.482,45.127,11.71,61.151a123.489,123.489,0,0,0,29.057,44.62,123.486,123.486,0,0,0,44.62,29.057c16.025,6.228,34.337,10.486,61.151,11.71,26.87,1.226,35.449,1.516,103.866,1.516s77-.29,103.866-1.516c26.815-1.224,45.127-5.482,61.151-11.71a128.817,128.817,0,0,0,73.677-73.677c6.228-16.025,10.486-34.337,11.71-61.151,1.226-26.87,1.516-35.449,1.516-103.866s-0.29-77-1.516-103.866c-1.224-26.815-5.482-45.127-11.71-61.151a123.486,123.486,0,0,0-29.057-44.62A123.487,123.487,0,0,0,421.018,17.3C404.993,11.077,386.681,6.819,359.866,5.6,333,4.369,324.418,4.079,256,4.079h0Z"/><path style="fill:#007aff" d="M256,126.635A129.365,129.365,0,1,0,385.365,256,129.365,129.365,0,0,0,256,126.635Zm0,213.338A83.973,83.973,0,1,1,339.974,256,83.974,83.974,0,0,1,256,339.973Z"/><circle style="fill:#007aff" cx="390.476" cy="121.524" r="30.23"/></svg></a><a href="https://twitter.com/getBonjourr" title="Check out our Twitter"><svg viewBox="0 0 300.00006 244.18703"><g transform="translate(-539.17946,-568.85777)" id="layer1"><path id="path3611" style="fill-opacity:1;fill-rule:nonzero;stroke:none" d="m 633.89823,812.04479 c 112.46038,0 173.95627,-93.16765 173.95627,-173.95625 0,-2.64628 -0.0539,-5.28062 -0.1726,-7.90305 11.93799,-8.63016 22.31446,-19.39999 30.49762,-31.65984 -10.95459,4.86937 -22.74358,8.14741 -35.11071,9.62551 12.62341,-7.56929 22.31446,-19.54304 26.88583,-33.81739 -11.81284,7.00307 -24.89517,12.09297 -38.82383,14.84055 -11.15723,-11.88436 -27.04079,-19.31655 -44.62892,-19.31655 -33.76374,0 -61.14426,27.38052 -61.14426,61.13233 0,4.79784 0.5364,9.46458 1.58538,13.94057 -50.81546,-2.55686 -95.87353,-26.88582 -126.02546,-63.87991 -5.25082,9.03545 -8.27852,19.53111 -8.27852,30.73006 0,21.21186 10.79366,39.93837 27.20766,50.89296 -10.03077,-0.30992 -19.45363,-3.06348 -27.69044,-7.64676 -0.009,0.25652 -0.009,0.50661 -0.009,0.78077 0,29.60957 21.07478,54.3319 49.0513,59.93435 -5.13757,1.40062 -10.54335,2.15158 -16.12196,2.15158 -3.93364,0 -7.76596,-0.38716 -11.49099,-1.1026 7.78383,24.2932 30.35457,41.97073 57.11525,42.46543 -20.92578,16.40207 -47.28712,26.17062 -75.93712,26.17062 -4.92898,0 -9.79834,-0.28036 -14.58427,-0.84634 27.05868,17.34379 59.18936,27.46396 93.72193,27.46396"/></g></svg></a><a href="https://github.com/victorazevedo-me/Bonjourr" title="Bonjourr's GitHub repository"><svg viewBox="0 0 1024 1024" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" transform="scale(64)"/></svg></a></div></div><p class="trn">Made in France with ❤️</p><p id="rand"><span class="trn">by</span></p><div id="rdv_website"><p><span class="trn">Consider</span> <a href="https://bonjourr.fr/#donate" class="trn">donating</a> <span class="trn">if you love Bonjourr</span> 😊</p></div></div>`;

id = name => document.getElementById(name);
cl = name => document.getElementsByClassName(name);
attr = (that, val) => that.setAttribute("class", val);
has = (that, val) => id(that) && id(that).getAttribute("class", val) ? true : false;

let db = null;
let stillActive = false;
let rangeActive = false;
let lazyClockInterval = 0;
const randomseed = Math.floor(Math.random() * 30) + 1;
const domshowsettings = id("showSettings");
const domlinkblocks = id("linkblocks");
const dominterface = id("interface");

//safe font for different alphabet
if (localStorage.lang === "ru" || localStorage.lang === "sk")
	id("styles").innerText = `
		body, #settings, #settings h5 {font-family: Helvetica, Calibri}
	`;

//cache rapidement temp max pour eviter que ça saccade
if ((new Date).getHours() >= 12) id("temp_max_wrap").style.display = "none";

//c'est juste pour debug le storage
function deleteBrowserStorage() {localStorage.clear()}
function getBrowserStorage() {console.log(localStorage)}
function getLocalStorage() {chrome.storage.local.get(null, (data) => {console.log(data)})}

//cache un peu mieux les données dans le storage
function localEnc(input, enc=true) {
	const a = input.split("")
	let n = ""
	for (let i in a) n += String.fromCharCode(a[i].charCodeAt() + (enc ? randomseed : -randomseed))
	return n
}

function storage(cat, val) {

	let data;

	if (localStorage.data) data = JSON.parse(atob(localStorage.data));
	else data = {}

	if (cat) {

		if (val !== undefined) {

			if (cat === "import") data = val;
			else data[cat] = val;
			
			localStorage.data = btoa(JSON.stringify(data));

		} else return data[cat];
	} else return data;
}

function slowRange(tosave) {
	//timeout avant de save pour éviter la surcharge d'instructions de storage
	clearTimeout(rangeActive);
	rangeActive = setTimeout(function() {
		storage(tosave[0], tosave[1]);
	}, 150);
}

function slow(that) {
	that.setAttribute("disabled", "");
	stillActive = setTimeout(() => {
		that.removeAttribute("disabled");
		clearTimeout(stillActive);
		stillActive = false;
	}, 700);
}

function traduction(ofSettings) {

	let local = localStorage.lang || "en";

	if (local !== "en") {

		let trns = (ofSettings ? id("settings").querySelectorAll('.trn') : document.querySelectorAll('.trn')),
			dom = [],
			dict = askfordict();

		for (let k = 0; k < trns.length; k++) {

			//trouve la traduction, sinon laisse le text original
			if (dict[trns[k].innerText])
				dom.push(dict[trns[k].innerText][localStorage.lang]);
			else
				dom.push(trns[k].innerText);
		}
			
		for (let i in trns) trns[i].innerText = dom[i]
	}
}

function tradThis(str) {

	let dict = askfordict(),
		lang = localStorage.lang || "en";

	return (lang === "en" ? str : dict[str][localStorage.lang])
}

function newClock(eventObj, init) {

	function displayControl() {

		const numeric = id('clock'),
			analog = id('analogClock'),
			analSec = id('analogSeconds');

		//cache celle qui n'est pas choisi
		attr((clock.analog ? numeric : analog), "hidden");
		attr((clock.analog ? analog : numeric), "");

		//cache l'aiguille des secondes
		if (!clock.seconds && clock.analog) attr(analSec, "hidden");
		else attr(analSec, "");
	}

	function main() {

		//retourne une liste [heure, minutes, secondes]
		function time() {
			const date = new Date();
			return [date.getHours(), date.getMinutes(), date.getSeconds()]
		}

		//besoin pour numerique et analogue
		function timezone(timezone, hour) {

			if (timezone === "auto" || timezone === NaN) return hour;
			else {

				let d = new Date;
				let offset = d.getTimezoneOffset();
				let utc = hour + (offset / 60);
				let setTime = (utc + parseInt(timezone)) % 24;

				return setTime;
			}
		}
		
		function numerical(timearray) {

			//seul numerique a besoin du ampm
			function toAmpm(val) {

				if (val > 12)
					val -= 12;
				else
					if (val === 0)
						val = 12;
					else
						val;

				return val
			}

			function fixunits(val) {
				val = (val < 10 ? "0" + val : val);
				return val
			}

			let h = clock.ampm ? toAmpm(timearray[0]) : timearray[0],
				m = fixunits(timearray[1]),
				s = fixunits(timearray[2]);

			id('clock').innerText = clock.seconds ? `${h}:${m}:${s}` : `${h}:${m}`;
		}

		function analog(timearray) {

			function rotation(that, val) {

				const spancss = that.style;

				if (lazyClockInterval === 0 || val === 0) {
					spancss.transition = "none";
				} else {
					if (spancss.transition === "none 0s ease 0s") spancss.transition = "transform .1s";
				}

				spancss.transform = `rotate(${parseInt(val)}deg)`;
			}

			// Initial clock: https://codepen.io/josephshambrook/pen/xmtco
			let s = timearray[2] * 6,
				m = timearray[1] * 6,// + (s / 60),
				h = timearray[0] * 30;//% 12 / 12 * 360 + (m / 12);


			//bouge les aiguilles minute et heure quand seconde ou minute arrive à 0
			if (true || timearray[2] === 0) rotation(id('minutes'), m);
			if (true || timearray[1] === 0) rotation(id('hours'), h);
		    
		    //tourne pas les secondes si pas de seconds
		    if (clock.seconds) rotation(id('analogSeconds'), s);

			//fix 0deg transition

		}

		//timezone control
		//analog control
		const array = time();

		array[0] = timezone(clock.timezone, array[0]);
		clock.analog ? analog(array) : numerical(array);
	}

	function startClock() {
		//stops multiple intervals
		clearInterval(lazyClockInterval);

		displayControl();
		main();
		lazyClockInterval = setInterval(main, 1000);
	}

	//controle très stricte de clock comme vous pouvez le voir
	//(je sais que je peux faire mieux)
	let clock;

	if (init) {

		clock = {
			analog: init.analog || false,
			seconds: init.seconds || false,
			ampm: init.ampm || false,
			timezone: init.timezone || "auto"
		}

		startClock();

	} else {

		const data = storage();

		clock = {
			analog: (data.clock ? data.clock.analog : false),
			seconds: (data.clock ? data.clock.seconds : false),
			ampm: (data.clock ? data.clock.ampm : false),
			timezone: (data.clock ? data.clock.timezone : "auto")
		}

		//if event change of clock parameters
		if (eventObj) {
			clock[eventObj.param] = eventObj.value;
			storage("clock", clock);
		}

		startClock();
	}
}

function date() {
	const date = new Date();
	const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];


	if (localStorage.usdate === "true") {

		id("jour").innerText = tradThis(days[date.getDay()]) + ",";
		id("chiffre").innerText = tradThis(months[date.getMonth()]);
		id("mois").innerText = date.getDate();

	} else {

		id("jour").innerText = tradThis(days[date.getDay()]);
		id("chiffre").innerText = date.getDate();
		id("mois").innerText = tradThis(months[date.getMonth()]);
	}
}

function greetings() {
	const h = (new Date()).getHours();
	let message;

	if (h > 6 && h < 12) message = "Good Morning";
	else if (h >= 12 && h < 18) message = "Good Afternoon";
	else if (h >= 18 && h <= 23) message = "Good Evening";
	else message = "Good Night";

	id("greetings").innerText = tradThis(message);
}

function quickLinks(event, that, initStorage) {

	//only on init
	if(!event && !that) {
		let dragged, hovered, current;
		let stillActive = false;
	}

	//enleve les selections d'edit
	const removeLinkSelection = x => (domlinkblocks.querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")}));

	//initialise les blocs en fonction du storage
	//utilise simplement une boucle de appendblock
	function initblocks(storage) {

		let array = storage.links || false;

		if (array) {

			for (let i in array) {
				appendblock(array[i], i, array);
			}
		}
	}

	function appendblock(arr, index, links) {

		//console.log(arr)
		let icon = (arr.icon.length > 0 ? arr.icon : "src/images/loading.gif");

		//le DOM du block
		let b = `<div class='block' draggable="false" source='${arr.url}'><div class='l_icon_wrap' draggable="false"><img class='l_icon' src='${icon}' draggable="false"></div><span>${arr.title}</span></div>`;

		//ajoute un wrap
		let block_parent = document.createElement('div');
		block_parent.setAttribute("class", "block_parent");
		block_parent.setAttribute("draggable", "true");
		block_parent.innerHTML = b;

		//l'ajoute au dom
		domlinkblocks.appendChild(block_parent);

		//met les events au dernier elem rajouté
		addEvents(domlinkblocks.lastElementChild);

		//si online et l'icon charge, en rechercher une
		if (window.navigator.onLine && icon === "src/images/loading.gif")
			addIcon(domlinkblocks.lastElementChild, arr, index, links);
	}

	function addEvents(elem) {

		function handleDrag(is, that) {

			const data = storage();
			const i = findindex(that);

			if (is === "start") dragged = [elem, data.links[i], i];

			else if (is === "enter") hovered = [elem, data.links[i], i];

			else if (is === "end") {

				//changes html blocks
				current = hovered[0].innerHTML;
				hovered[0].innerHTML = dragged[0].innerHTML;
				dragged[0].innerHTML = current;


				//changes link storage
				let allLinks = data.links;

				allLinks[dragged[2]] = hovered[1];
				allLinks[hovered[2]] = dragged[1];

				storage("links", allLinks);
			}
		}

		elem.ondragstart = function(e) {
			//e.preventDefault();
			e.dataTransfer.setData("text/plain", e.target.id);
			e.currentTarget.style.cursor = "pointer";
			handleDrag("start", this)
		}

		elem.ondragenter = function(e) {
			e.preventDefault();
			handleDrag("enter", this)
		}

		elem.ondragend = function(e) {
			e.preventDefault();
			handleDrag("end", this)
		}

		elem.oncontextmenu = function(e) {
			e.preventDefault();
			if(mobilecheck) editlink(this);
		}

		elem.onmouseup = function(e) {

			removeLinkSelection();
			(e.which === 3 ? editlink(this) : (!has("settings", "shown") ? openlink(this, e) : ""));
		}
	}

	function editEvents() {
		id("e_delete").onclick = function() {
			removeLinkSelection();
			removeblock(parseInt(id("edit_link").getAttribute("index")));
			attr(id("edit_linkContainer"), "");
		}

		id("e_submit").onclick = function() {
			removeLinkSelection();
			editlink(null, parseInt(id("edit_link").getAttribute("index")))
			attr(id("edit_linkContainer"), "");
		}

		id("e_close").onmouseup = function() {
			removeLinkSelection();
			attr(id("edit_linkContainer"), "");
		}

		id("re_title").onmouseup = function() {
			id("e_title").value = "";
		}

		id("re_url").onmouseup = function() {
			id("e_url").value = "";
		}

		id("re_iconurl").onmouseup = function() {
			id("e_iconurl").value = "";
		}
	}

	function editlink(that, i, customIcon) {

		function controlIcon(old) {
			let iconurl = id("e_iconurl");
			let iconfile = id("e_iconfile");

			if (iconurl.value !== "")
				return iconurl.value;
			else
				return old;
		}

		function updateLinkHTML(newElem) {
			let block = domlinkblocks.children[i + 1];

			block.children[0].setAttribute("source", newElem.url);
			block.children[0].lastChild.innerText = newElem.title;
			block.querySelector("img").src = newElem.icon;
		}

		//edit est visible
		if (i || i === 0) {

			const data = storage();
			let allLinks = data.links;
			let element = {
				title: id("e_title").value,
				url: id("e_url").value,
				icon: controlIcon(data.links[i].icon)
			}

			allLinks[i] = element;
			updateLinkHTML(element);
			storage("links", allLinks);

		//affiche edit avec le bon index
		} else {
			
			const data = storage();
			const index = findindex(that);
			const liconwrap = that.querySelector(".l_icon_wrap");

			attr(liconwrap, "l_icon_wrap selected");


			if (has("settings", "shown"))
				attr(id("edit_linkContainer"), "shown pushed");
			else
				attr(id("edit_linkContainer"), "shown");


			id("edit_link").setAttribute("index", index);

			id("e_title").value = data.links[index].title;
			id("e_url").value = data.links[index].url;
			id("e_iconurl").value = data.links[index].icon;
		}
	}

	function findindex(that) {

		//passe la liste des blocks, s'arrete si that correspond
		//renvoie le nombre de loop pour l'atteindre

		const list = domlinkblocks.children;

		for (let i = 0; i < list.length; i++) if (that === list[i]) return i-1
	}

	function removeblock(index) {

		let count = index
		const data = storage()

		function ejectIntruder(arr) {

			if (arr.length === 1) {
				return []
			}

			if (count === 0) {

				arr.shift();
				return arr;
			}
			else if (count === arr.length) {

				arr.pop();
				return arr;
			}
			else {

				arr.splice(count, 1);
				return arr;
			}
		}

		var linkRemd = ejectIntruder(data.links);

		//si on supprime un block quand la limite est atteinte
		//réactive les inputs
		if (linkRemd.length === 16 - 1) id("i_url").removeAttribute("disabled");

		//enleve le html du block
		var block_parent = domlinkblocks.children[count + 1];
		block_parent.setAttribute("class", "block_parent removed");
		
		setTimeout(function() {

			domlinkblocks.removeChild(block_parent);

			//enleve linkblocks si il n'y a plus de links
			if (linkRemd.length === 0)
				domlinkblocks.style.visibility = "hidden";
		}, 200);

		storage("links", linkRemd);
	}

	function addIcon(elem, arr, index, links) {

		function faviconXHR(url) {

			return new Promise(function(resolve, reject) {

				var xhr = new XMLHttpRequest();
				xhr.open('GET', url, true);

				xhr.onload = function() {

					if (xhr.status >= 200 && xhr.status < 400)
						resolve(JSON.parse(this.response));
					else
						resolve(null);
				}

				xhr.onerror = reject;
				xhr.send()
			})
		}

		function filterIcon(json) {
			//prend le json de favicongrabber et garde la meilleure

			//si le xhr est cassé, prend une des deux icones
			if (json === null) {
				let path = "src/images/icons/";
				path += (Math.random() > .5 ? "orange.png" : "yellow.png");
				return path;
			}

			var s = 0;
			var a, b = 0;

			//garde la favicon la plus grande
			for (var i = 0; i < json.icons.length; i++) {	

				if (json.icons[i].sizes) {

					a = parseInt(json.icons[i].sizes);

					if (a > b) {
						s = i;
						b = a;
					}

				//si il y a une icone android ou apple, la prendre direct
				} else if (json.icons[i].src.includes("android-chrome") || json.icons[i].src.includes("apple-touch")) {
					return json.icons[i].src;
				}
			}

			//si l'url n'a pas d'icones, utiliser besticon
			if (json.icons.length === 0) {
				return "https://besticon.herokuapp.com/icon?url=" + json.domain + "&size=80"
			} else {
				return json.icons[s].src;
			}
		}

		//prend le domaine de n'importe quelle url
		var a = document.createElement('a');
		a.href = arr.url;
		var hostname = a.hostname;

		faviconXHR("http://favicongrabber.com/api/grab/" + hostname).then((icon) => {

			var img = elem.querySelector("img");
			var icn = filterIcon(icon);
			img.src = icn;

			links[index].icon = icn;
			storage("links", links);
		})
	}

	function linkSubmission() {

		function filterUrl(str) {

			let reg = new RegExp("^(http|https)://", "i");

			//config ne marche pas
			if (str.startsWith("about:") || str.startsWith("chrome://")) return false

			if (str.startsWith("file://")) return str

			//premier regex pour savoir si c'est http
			if (!str.match(reg)) str = "http://" + str

			//deuxieme pour savoir si il est valide (avec http)
			if (str.match(reg))
				return str.match(reg).input;
			else
				return false;
		}

		function saveLink(lll) {

			slow(id("i_url"));

			//remet a zero les inputs
			id("i_title").value = "";
			id("i_url").value = "";

			let full = false;
			const data = storage();
			let arr = [];

			//array est tout les links + le nouveau
			if (data.links && data.links.length > 0) {

				if (data.links.length < 16 - 1) {

					arr = data.links;
					arr.push(lll);

				} else {
					full = true;
				}

			//array est seulement le link
			} else {
				arr.push(lll);
				domlinkblocks.style.visibility = "visible";
			}
			
			//si les blocks sont moins que 16
			if (!full) {
				storage("links", arr);
				appendblock(lll, arr.length - 1, arr);
			} else {

				//desactive tout les input url
				id("i_url").setAttribute("disabled", "disabled");
			}
		}

		titleControl = t => (t.length > 42 ? t.slice(0, 42) + "..." : t);

		//append avec le titre, l'url ET l'index du bloc

		let links = {
			title: titleControl(id("i_title").value),
			url: filterUrl(id("i_url").value),
			icon: ""
		}
		
		//si l'url filtré est juste
		if (links.url && id("i_url").value.length > 2) {

			//et l'input n'a pas été activé ya -1s
			if (!stillActive) saveLink(links);
		}
	}

	function openlink(that, e) {

		const source = that.children[0].getAttribute("source");
		const a_hiddenlink = id("hiddenlink");
		const data = storage()

		a_hiddenlink.setAttribute("href", source);
		a_hiddenlink.setAttribute("target", (data.linknewtab || e.which === 2 ? "_blank" : "_self"));
		a_hiddenlink.click();
	}

	//TOUT LES EVENTS, else init

	if (event === "input" && that.which === 13) linkSubmission();

	else if (event === "button") linkSubmission();

	else if (event === "linknewtab") {
		storage("linknewtab", (that.checked ? true : false));
		id("hiddenlink").setAttribute("target", "_blank");
	}
	else {
		initblocks(initStorage);
		editEvents();
	}
}

function weather(event, that, initStorage) {

	function cacheControl(storage) {

		let now = Math.floor((new Date()).getTime() / 1000);
		let param = (storage.weather ? storage.weather : "");

		if (storage.weather && storage.weather.lastCall) {

			
			//si weather est vieux d'une demi heure (1800s)
			//ou si on change de lang
			//faire une requete et update le lastcall
			if (sessionStorage.lang || now > storage.weather.lastCall + 1800) {

				dataHandling(param.lastState);
				request(param, "current");

				//si la langue a été changé, suppr
				if (sessionStorage.lang) sessionStorage.removeItem("lang");

			} else {

				dataHandling(param.lastState);
			}

			//high ici
			if (storage.weather && storage.weather.fcDay === (new Date).getDay()) {
				id("temp_max").innerText = storage.weather.fcHigh + "°";
			} else {
				request(storage.weather, "forecast");
			}

		} else {

			//initialise a Paris + Metric
			//c'est le premier call, requete + lastCall = now
			initWeather();
		}
	}

	function initWeather() {

		let param = {
			city: "Paris",
			ccode: "FR",
			location: false,
			unit: "metric"
		};

		navigator.geolocation.getCurrentPosition((pos) => {

			param.location = [];

			//update le parametre de location
			param.location.push(pos.coords.latitude, pos.coords.longitude);
			storage("weather", param);

			request(param, "current");
			request(param, "forecast");
			
		}, (refused) => {

			param.location = false;

			storage("weather", param);

			request(param, "current");
			request(param, "forecast");
		});
	}
	
	function request(arg, wCat) {

		
		function urlControl(arg, forecast) {

			let url = 'https://api.openweathermap.org/data/2.5/';


			if (forecast)
				url += "forecast?appid=" + atob(WEATHER_API_KEY[0]);
			else
				url += "weather?appid=" + atob(WEATHER_API_KEY[1]);


			//auto, utilise l'array location [lat, lon]
			if (arg.location) {
				url += `&lat=${arg.location[0]}&lon=${arg.location[1]}`;
			} else {
				url += `&q=${encodeURI(arg.city)},${arg.ccode}`;
			}

			url += `&units=${arg.unit}&lang=${localStorage.lang}`;

			return url;
		}

		function weatherResponse(parameters, response) {

			//sauvegarder la derniere meteo
			let now = Math.floor((new Date()).getTime() / 1000);
			let param = parameters;
			param.lastState = response;
			param.lastCall = now;
			storage("weather", param);

			//la réponse est utilisé dans la fonction plus haute
			dataHandling(response);
		}
	
		function forecastResponse(parameters, response) {

			function findHighTemps(d) {
			
				let i = 0;
				let newDay = new Date(d.list[0].dt_txt).getDay();
				let currentDay = newDay;
				let arr = [];
				

				//compare la date toute les 3h (list[i])
				//si meme journée, rajouter temp max a la liste

				while (currentDay == newDay && i < 10) {

					newDay = new Date(d.list[i].dt_txt).getDay();
					arr.push(d.list[i].main.temp_max);

					i += 1;
				}

				let high = Math.floor(Math.max(...arr));

				//renvoie high
				return [high, currentDay];
			}

			let fc = findHighTemps(response);

			//sauvegarder la derniere meteo
			let param = parameters;
			param.fcHigh = fc[0];
			param.fcDay = fc[1];
			storage("weather", param);

			id("temp_max").innerText = param.fcHigh + "°";
		}

		let url = (wCat === "current" ? urlControl(arg, false) : urlControl(arg, true));

		let request_w = new XMLHttpRequest();
		request_w.open('GET', url, true);

		request_w.onload = function() {
			
			let resp = JSON.parse(this.response);

			if (request_w.status >= 200 && request_w.status < 400) {

				if (wCat === "current")
					weatherResponse(arg, resp);
				
				else if (wCat === "forecast") 
					forecastResponse(arg, resp);

			} else 
				submissionError(resp.message);
		}

		request_w.send();
	}	
	
	function dataHandling(data) {

		let hour = (new Date).getHours();

		function getIcon() {
			//si le soleil est levé, renvoi jour
			//le renvoie correspond au nom du répertoire des icones jour / nuit
			function dayOrNight(sunset, sunrise) {
				let ss = new Date(sunset * 1000);
				let sr = new Date(sunrise * 1000);

				return (hour > sr.getHours() && hour < ss.getHours() ? "day" : "night")
			}

			//prend l'id de la météo et renvoie une description
			//correspond au nom de l'icone (+ .png)
			function imgId(c) {

				let temp, codes = {
					"thunderstorm": 200,
					"lightdrizzle": 300,
					"showerdrizzle": 302,
					"lightrain": 500,
					"showerrain": 502,
					"snow": 602,
					"mist": 701,
					"clearsky": 800,
					"fewclouds": 801,
					"brokenclouds": 803
				}	

				for(let key in codes) {

					if (c >= codes[key]) temp = key;
				}

				return temp || "clearsky";
			}

			let d_n = dayOrNight(data.sys.sunset, data.sys.sunrise);
			let weather_id = imgId(data.weather[0].id);
	 		let icon_src = `src/images/weather/${d_n}/${weather_id}.png`;
	 		id("widget").setAttribute("src", icon_src);
	 		id("widget").setAttribute("class", "shown");
		}

		function getDescription() {

			//pour la description et temperature
			//Rajoute une majuscule à la description
			let meteoStr = data.weather[0].description;
			meteoStr = meteoStr[0].toUpperCase() + meteoStr.slice(1);
			id("desc").innerText = meteoStr + ".";


			//si c'est l'après midi (apres 12h), on enleve la partie temp max
			let dtemp, wtemp;

			if (hour < 12) {

				//temp de desc et temp de widget sont pareil
				dtemp = wtemp = Math.floor(data.main.temp) + "°";

			} else {

				//temp de desc devient temp de widget + un point
				//on vide la catégorie temp max
				wtemp = Math.floor(data.main.temp) + "°";
				dtemp = wtemp + ".";
			}

			id("temp").innerText = dtemp;
			id("widget_temp").innerText = wtemp;
		}

		getDescription();
		getIcon();
	}
	
	function submissionError(error) {

		//affiche le texte d'erreur
		id("wrongCity").innerText = error;
		id("wrongCity").style.display = "block";
		id("wrongCity").style.opacity = 1;

		//l'enleve si le user modifie l'input
		id("i_city").onkeydown = function() {

			id("wrongCity").style.opacity = 0;
			setTimeout(function() {
				id("wrongCity").style.display = "none";
			}, 200);
		}
	}
	
	function updateCity() {

		slow(that);

		const data = storage();
		const param = data.weather;

		param.ccode = i_ccode.value;
		param.city = i_city.value;

		if (param.city.length < 2) return false;

		request(param, "current");
		request(param, "forecast");

		i_city.setAttribute("placeholder", param.city);
		i_city.value = "";
		i_city.blur();

		storage("weather", param);
	}

	function updateUnit(that) {

		slow(that);

		const data = storage();
		const param = data.weather;

		if (that.checked) {
			param.unit = "imperial";
		} else {
			param.unit = "metric";
		}

		request(param, "current");
		request(param, "forecast");
		
		storage("weather", param);
	}
	
	function updateLocation(that) {

		slow(that);

		const data = storage();
		const param = data.weather;
		param.location = [];

		if (that.checked) {

			that.setAttribute("disabled", "");

			navigator.geolocation.getCurrentPosition((pos) => {

				//update le parametre de location
				param.location.push(pos.coords.latitude, pos.coords.longitude);
				storage("weather", param);

				//request la meteo
				request(param, "current");
				request(param, "forecast");

				//update le setting
				sett_city.setAttribute("class", "city hidden");
				that.removeAttribute("disabled");
				
			}, (refused) => {

				//désactive geolocation if refused
				that.checked = false
				that.removeAttribute("disabled");

				if (!param.city) initWeather();
			});

		} else {

			sett_city.setAttribute("class", "city");

			i_city.setAttribute("placeholder", param.city);
			i_ccode.value = param.ccode;

			param.location = false;
			storage("weather", param);
			
			request(param, "current");
			request(param, "forecast");
		}
	}

	const WEATHER_API_KEY = [
	"YTU0ZjkxOThkODY4YTJhNjk4ZDQ1MGRlN2NiODBiNDU=",
	"Y2U1M2Y3MDdhZWMyZDk1NjEwZjIwYjk4Y2VjYzA1NzE=",
	"N2M1NDFjYWVmNWZjNzQ2N2ZjNzI2N2UyZjc1NjQ5YTk="];
	const i_city = id("i_city");
	const i_ccode = id("i_ccode");
	const sett_city = id("sett_city");

	//TOUT LES EVENTS, default c'est init
	switch(event) {

		case "city":
			updateCity();
			break;

		case "units":
			updateUnit(that);
			break;

		case "geol":
			updateLocation(that);
			break;

		default:
			cacheControl(initStorage);
	}
}

function imgCredits(src, type) {

	const location = id("location"),
		artist = id("artist"),
		credit = id("credit"),
		onUnsplash = id("onUnsplash");

	if (type === "dynamic") {
		attr(onUnsplash, "shown");
		location.innerText = src.location.text;
		location.setAttribute("href", src.location.url);
		artist.innerText = src.artist.text;
		artist.setAttribute("href", src.artist.url);
	} else {
		if (type === "default") attr(onUnsplash, "hidden")
	}

	if (type === "custom") attr(credit, "hidden");
	else attr(credit, "shown");

	if (type === "default") {

		const credits = [
			{"title": "Santa Monica",
				"artist": "Avi Richards",
				"url": "https://unsplash.com/photos/KCgADeYejng",
				"id": "avi-richards-beach"},
			{"title": "Waimea Canyon",
				"artist": "Tyler Casey",
				"url": "https://unsplash.com/photos/zMyZrfcLXQE",
				"id": "tyler-casey-landscape"},
			{"title": "Fern",
				"artist": "Tahoe Beetschen",
				"url": "https://unsplash.com/photos/Tlw9fp2Z-8g",
				"id": "tahoe-beetschen-ferns"},
			{"title": "iOS 13 wallpaper",
				"artist": "Apple",
				"url": "https://www.apple.com/ios/ios-13-preview/",
				"id": "ios13"}];

		for (let i in credits) {

			if (src && src.includes(credits[i].id)) {
				location.setAttribute("href", credits[i].url);
				location.innerText = credits[i].title + " - ";
				artist.innerText = credits[i].artist;

				return true;
			}
		}
	}
}

function imgBackground(val) {

	if (val) {
		let img = new Image;

		img.onload = () => {
			id("background").style.backgroundImage = `url(${val})`;
			id("background_overlay").style.animation =  "fade .1s ease-in forwards";
		}

		img.src = val;
		img.remove();
		
	} 
	else return id("background").style.backgroundImage;
}

function initBackground(storage) {

	let type = storage.background_type || "default";
	let image = storage.background_image || "src/images/backgrounds/avi-richards-beach.jpg";

	if (storage.background_type === "dynamic") {

		unsplash(storage.dynamic)

	} else {

		imgBackground(image);
		imgCredits(image, type);
		unsplash(null, null, true); //on startup
	}


	let blur = (Number.isInteger(storage.background_blur) ? storage.background_blur : 25);
	let bright = (!isNaN(storage.background_bright) ? storage.background_bright : 1);

	filter("init", [blur, bright]);
}

function unsplash(data, event, startup) {

	//on startup nothing is displayed
	const loadbackground = url => (startup ? noDisplayImgLoad(url) : imgBackground(url));

	function noDisplayImgLoad(val, callback) {
		let img = new Image;

		img.onload = callback;
		img.src = val;
		img.remove();
	}

	function freqControl(state, every, last) {

		const d = new Date;
		if (state === "set") return (every === "tabs" ? 0 : d.getTime());

		if (state === "get") {

			let calcLast = 0;
			let today = d.getTime();

			if (every === "hour") calcLast = last + 3600 * 1000;
			else if (every === "day") calcLast = last + 86400 * 1000;
			else if (every === "pause") calcLast = 10**13 - 1; //le jour de la fin du monde lmao

			//retourne le today superieur au calculated last
			return (today > calcLast);
		}
	}

	function cacheControl(d) {

		//as t on besoin d'une nouvelle image ?
		let needNewImage = freqControl("get", d.every, d.time);
		if (needNewImage) {

			//sauvegarde le nouveau temps
			d.time = freqControl("set", d.every);

			//si next n'existe pas, init
			if (d.next.url === "") {

				req("current", d, true);

			//sinon prendre l'image preloaded (next)
			} else {

				loadbackground(d.next.url);
				credit(d.next);
				req("current", d, false);
			}

		//pas besoin d'image, simplement current
		} else {
			loadbackground(d.current.url);
			credit(d.current);
		}
	}

	function req(which, d, init) {

		function dayCollections() {
			const h = (new Date()).getHours()
			if (h > 10 && h < 18) return "4933370" 		//day
			else if (h > 7 && h < 21) return "9489922" 	//evening-noon
			else return "9489906"						//night
		}

		obf = n => (n===0?atob("aHR0cHM6Ly9hcGkudW5zcGxhc2guY29tL3Bob3Rvcy9yYW5kb20/Y29sbGVjdGlvbnM9"):atob("MzY4NmMxMjIyMWQyOWNhOGY3OTQ3Yzk0NTQyMDI1ZDc2MGE4ZTBkNDkwMDdlYzcwZmEyYzRiOWY5ZDM3N2IxZA=="));
		let xhr = new XMLHttpRequest();
		xhr.open('GET', obf(0) + dayCollections(), true);
		xhr.setRequestHeader('Authorization',`Client-ID ${obf(1)}`);

		xhr.onload = function() {
			
			let resp = JSON.parse(this.response);

			if (xhr.status >= 200 && xhr.status < 400) {

				let screenWidth = window.devicePixelRatio * screen.width;

				resp = {
					url: resp.urls.raw +`&w=${screenWidth}&fm=jpg&q=70`,
					link: resp.links.html,
					username: resp.user.username,
					name: resp.user.name,
					city: resp.location.city,
					country: resp.location.country
				}

				if (init) {

					//si init, fait 2 req (current, next) et save sur la 2e
					if (which === "current") {
						d.current = resp;
						loadbackground(d.current.url);
						credit(d.current);
						req("next", d, true);
					}
					else if (which === "next") {
						d.next = resp;
						storage("dynamic", d);
					}

				//si next existe, current devient next et next devient la requete
				//preload la prochaine image (sans l'afficher)
				} else {

					noDisplayImgLoad(resp.url, () => {
						d.current = d.next;
						d.next = resp;
						storage("dynamic", d);
					})					
				}
			}
		}
		xhr.send();
	}

	function credit(d) {

		let loc = "";

		if (d.city !== null && d.country !== null) loc = `${d.city}, ${d.country} - `;
		else if (d.country !== null) loc = `${d.country} - `;
		else loc = "Photo - ";

		let infos = {
			location: {
				text: loc,
				url: `${d.link}?utm_source=Bonjourr&utm_medium=referral`
			},
			artist: {
				text: d.name, 
				url: `https://unsplash.com/@${d.username}?utm_source=Bonjourr&utm_medium=referral`
			}
		}

		if(!startup) imgCredits(infos, "dynamic");
	}

	if (data && data !== true) cacheControl(data);
	else {

		const data = storage();

		//si on change la frequence, juste changer la freq
		if (event) {
			storage.dynamic.every = event;
			storage("dynamic", storage.dynamic);
			return true;
		}

		if (storage.dynamic && storage.dynamic !== true) {
			cacheControl(storage.dynamic)
		} else {
			let initDyn = {
				current: {
					url: "",
					link: "",
					username: "",
					name: "",
					city: "",
					country: ""
				},
				next: {
					url: "",
					link: "",
					username: "",
					name: "",
					city: "",
					country: "",
				},
				every: "hour",
				time: 0
			}

			cacheControl(initDyn)
		}
	}
}

function remSelectedPreview() {
	let a = cl("imgpreview");

	for (var i = 0; i < a.length; i++) {

		if (a[i].classList[1] === "selected")
			a[i].setAttribute("class", "imgpreview")
	}
}

function filter(cat, val) {

	let result = "";

	switch (cat) {

		case "init":
			result = `blur(${val[0]}px) brightness(${val[1]})`;
			break;

		case "blur":
			result = `blur(${val}px) brightness(${id("i_bright").value})`;
			break;

		case "bright":
			result = `blur(${id("i_blur").value}px) brightness(${val})`;
			break;
	}

	id('background').style.filter = result;
}

function darkmode(choice, initStorage) {

	function apply(state) {

		function auto(wdata) {

			//compare current hour with weather sunset / sunrise

			const ls = wdata.lastState;
			const sunrise = new Date(ls.sys.sunrise * 1000).getHours();
			const sunset = new Date(ls.sys.sunset * 1000).getHours();
			const hr = (new Date()).getHours();

			return (hr < sunrise || hr > sunset ? "dark" : "");
		}

		//uses chromesync data on startup, sessionsStorage on change

		const weather = (initStorage ? initStorage.weather : localEnc(sessionStorage.data, false).weather);
		let bodyClass;

		//dark mode is defines by the body class

		switch (state) {
			case "system": 
				bodyClass = "autodark";
				break;

			case "auto": 
				bodyClass = auto(weather);
				break;
				
			case "enable": 
				bodyClass = "dark";
				break;
				
			default: 
				bodyClass = "";		
		}

		document.body.setAttribute("class", bodyClass);
	}
	
	//apply class, save if event
	if (choice) {
		apply(choice, true);
		storage("dark", choice);
	} else {
		apply(initStorage.dark)
	}
}

function distractMode(that, initStorage) {

	function apply(on) {

		let ui = dominterface;
		let uiClass = ui.getAttribute("class");

		if (on) {
			attr(ui, (uiClass === "pushed" ? "pushed distract" : "distract"));
			attr(id("showSettings"), "distract");
		} else {
			attr(ui, (uiClass === "pushed distract" ? "pushed" : ""));
			attr(id("showSettings"), "");
		}
	}

	//change event
	if (that || that === false) {
		apply(that.checked);
		storage("distract", that.checked);
		localStorage.distract = that.checked;
		return true;
	}

	//init
	let localDist = (localStorage.distract === "true" ? true : false);

	if (localDist) {
		apply(localDist);
	} else {
		apply(initStorage);
	}
}

function searchbar(event, that, initStorage) {

	function display(value, init) {

		id("sb_container").setAttribute("class", (value ? "shown" : "hidden"));

		id("searchbar").onkeyup = function(e) {
			if (e.which === 13) window.location = localisation(this.value)
		}

		if(!init) {
			storage("searchbar", value);
			id("choose_searchengine").setAttribute("class", (value ? "shown" : "hidden"));
		}
	}

	function localisation(q) {
		
		let response = "";
		const lang = localStorage.lang || "en";
		const engine = localStorage.engine || "s_google";

		//les const l_[engine] sont dans lang.js

		switch (engine) {
			case "s_ddg":
				response = "https://duckduckgo.com/?q=" + q + l_ddg[lang]
				break
			case "s_google":
				response = "https://www.google" + l_google[lang] + q
				break
			case "s_startpage":
				response = "https://www.startpage.com/do/dsearch?query=" + q + l_startpage[lang]
				break
			case "s_qwant":
				response = "https://www.qwant.com/?q=" + q + l_qwant[lang]
				break
			case "s_yahoo":
				response = "https://" + l_yahoo[lang] + q
				break
			case "s_bing":
				response = "https://www.bing.com/search?q=" + q
				break
			case "s_ecosia":
				response = "https://www.ecosia.org/search?q=" + q
				break

		}

		return response
	}

	function engine(value, init) {

		const names = {
			"s_startpage" : "Startpage",
			"s_ddg" : "DuckDuckGo",
			"s_qwant" : "Qwant",
			"s_ecosia" : "Ecosia",
			"s_google" : "Google",
			"s_yahoo" : "Yahoo",
			"s_bing" : "Bing"
		}

		id("searchbar").setAttribute("placeholder", tradThis("Search on " + names[value]));
		if(!init) storage("searchbar_engine", value);
		localStorage.engine = value;
	}

	if (event) (event === "searchbar" ? display(that.checked) : engine(that.value));

	//init
	else {

		let searchbar = initStorage.searchbar || false;
		let searchengine = initStorage.searchbar_engine || "s_google";

		//display
		display(searchbar, true);
		engine(searchengine, true);
	}
}

function signature() {
	let v = "<a href='https://victor-azevedo.me/'>Victor Azevedo</a>";
	let t = "<a href='https://tahoe.be'>Tahoe Beetschen</a>";
	let e = document.createElement("span");

	e.innerHTML = Math.random() > 0.5 ? ` ${v} & ${t}` : ` ${t} & ${v}`;
	id("rand").appendChild(e);
}

function mobilecheck() {
	let check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

function showPopup(data) {

	//s'affiche après 10 tabs
	if (data > 10) {

		let popup = id("popup"),
			closePopup = id("closePopup");

		//attendre avant d'afficher
		setTimeout(function() {popup.classList.add("shown")}, 2000)

		closePopup.onclick = function() {
			popup.classList.add("removed")
			storage("reviewPopup", "removed");
		}
	}
	else if (typeof(data) === "number") storage("reviewPopup", data + 1);
	else if (data !== "removed") storage("reviewPopup", 0);
	else if (data === "removed") document.body.removeChild(popup);
}

//comme un onload, sans le onload
const data = storage()
traduction();
newClock(null, data.clock);
date();
greetings();
distractMode(null, data.distract);
darkmode(null, data);
initBackground(data);
weather(null, null, data);
quickLinks(null, null, data);
searchbar(null, null, data);

//review popup
showPopup(data.reviewPopup);

//met le storage dans le sessionstorage
//pour que les settings y accede plus facilement
sessionStorage.data = localEnc(JSON.stringify(data));


if (mobilecheck()) {

	//blocks interface height
	//defines credits & showsettings position from top

	let show = id("showSettings");
	let cred = id("credit");
	let heit = window.innerHeight;

	show.style.bottom = "auto";
	cred.style.bottom = "auto";

	dominterface.style.height = `${heit}px`;
	show.style.padding = 0;
	show.style.top = `${heit - show.children[0].offsetHeight - 12}px`;
	cred.style.top = `${heit - cred.offsetHeight - 12}px`;
}












function defaultBg() {

	let bgTimeout, oldbg;

	id("default").onmouseenter = function() {
		oldbg = id("background").style.backgroundImage.slice(5, imgBackground().length - 2);
	}

	id("default").onmouseleave = function() {
		clearTimeout(bgTimeout);
		imgBackground(oldbg);
	}

	function imgEvent(state, that) {

		if (state === "enter") {

			if (bgTimeout) clearTimeout(bgTimeout);

			let src = "/src/images/backgrounds/" + that.getAttribute("source");

			bgTimeout = setTimeout(function() {

				//timeout de 300 pour pas que ça se fasse accidentellement
				//prend le src de la preview et l'applique au background
				imgBackground(src);

			}, 300);

		} else if (state === "leave") {

			clearTimeout(bgTimeout);

		} else if (state === "mouseup") {

			var src = "/src/images/backgrounds/" + that.getAttribute("source");

		    imgBackground(src);
		    imgCredits(src, "default");

			clearTimeout(bgTimeout);
			oldbg = src;

			//enleve selected a tout le monde et l'ajoute au bon
			remSelectedPreview();
			//ici prend les attr actuels et rajoute selected après (pour ioswallpaper)
			var tempAttr = that.getAttribute("class");
			that.setAttribute("class", tempAttr + " selected");

			storage("last_default", src);
			storage("background_image", src);
			storage("background_type", "default");
		}
	}

	var imgs = cl("imgpreview");
	for (var i = 0; i < imgs.length; i++) {

		imgs[i].onmouseenter = function() {imgEvent("enter", this)}
		imgs[i].onmouseleave = function() {imgEvent("leave", this)}
		imgs[i].onmouseup = function() {imgEvent("mouseup", this)}
	}
}

function selectBackgroundType(cat) {

	id("default").style.display = "none";
	id("dynamic").style.display = "none";
	id(cat).style.display = "block";

	if (cat === "dynamic") unsplash()

	storage("background_type", cat);
}

function settingsEvents() {

	// file input animation
	let fontObj = {};

	//quick links
	id("i_title").onkeypress = function(e) {
		if (e.which === 13) quickLinks("input", e)
	}

	id("i_url").onkeypress = function(e) {
		if (e.which === 13) quickLinks("input", e)
	}

	id("submitlink").onmouseup = function() {
		quickLinks("button", this)
	}

	id("i_linknewtab").onchange = function() {
		quickLinks("linknewtab", this)
	}

	//visuals
	id("i_type").onchange = function() {
		selectBackgroundType(this.value)
	}

	id("i_freq").onchange = function() {
		unsplash(null, this.value);
	}



	id("i_blur").oninput = function() {
		filter("blur", this.value);
		slowRange(["background_blur", parseInt(this.value)]);
	};

	id("i_bright").oninput = function() {
		filter("bright", this.value);
		slowRange(["background_bright", parseFloat(this.value)]);
	};

	id("i_dark").onchange = function() {
		darkmode(this.value)
	}

	id("i_distract").onchange = function() {
		distractMode(this);
	}



	//Time and date

	id("i_ampm").onchange = function() {
		newClock({param: "ampm", value: this.checked});
	}

	id("i_timezone").onchange = function() {
		newClock({param: "timezone", value: this.value});
	}

	id("i_usdate").onchange = function() {

		let rep = (this.checked ? true : false);

		localStorage.usdate = rep;
		storage("usdate", rep);
		date();
	}

	//weather
	id("b_city").onmouseup = function() {
		if (!stillActive) weather("city", this);
	}

	id("i_city").onkeypress = function(e) {
		if (!stillActive && e.which === 13) weather("city", this)
	}

	id("i_units").onchange = function() {
		if (!stillActive) weather("units", this)
	}

	id("i_geol").onchange = function() {
		if (!stillActive) weather("geol", this)
	}
	
	//searchbar
	id("i_sb").onchange = function() {

		if (!stillActive) searchbar("searchbar", this);
		slow(this);
	}

	id("i_sbengine").onchange = function() {
		searchbar("engine", this)
	}




	//general

	id("i_lang").onchange = function() {

		localStorage.lang = this.value;
		sessionStorage.lang = this.value;
		//si local n'est pas utilisé, sync la langue
		if (!localStorage.data) storage("lang", this.value);

		//s'assure que le localStorage a bien changé
		if (localStorage.lang) location.reload();
	}


	id("submitReset").onclick = function() {
		importExport("reset");
	}

	id("submitExport").onclick = function() {
		importExport("exp", true);
	}

	id("submitImport").onclick = function() {
		importExport("imp", true);
	}

	id("i_import").onkeypress = function(e) {
		if (e.which === 13) importExport("imp", true);
	}

	id("i_export").onfocus = function() {
		importExport("exp")
	}
}

function initParams() {

	const data = JSON.parse(localEnc(sessionStorage.data, false));

	initInput = (dom, cat, base) => (id(dom).value = (cat !== undefined ? cat : base));
	initCheckbox = (dom, cat) => (id(dom).checked = (cat ? true : false));
	isThereData = (cat, sub) => (data[cat] ? data[cat][sub] : undefined);

	initInput("i_type", data.background_type, "default");
	initInput("i_blur", data.background_blur, 25);
	initInput("i_bright", data.background_bright, 1);
	initInput("i_dark", data.dark, "disable");
	initInput("i_sbengine", data.searchbar_engine, "s_startpage");
	initInput("i_timezone", isThereData("clock", "timezone"), "auto");
	initInput("i_freq", isThereData("dynamic", "every"), "hour");
	initInput("i_ccode", isThereData("weather", "ccode"), "US");

	initCheckbox("i_geol", isThereData("weather", "location"));
	initCheckbox("i_units", (isThereData("weather", "unit") === "imperial"));
	initCheckbox("i_distract", data.distract);
	initCheckbox("i_linknewtab", data.linknewtab);
	initCheckbox("i_sb", data.searchbar);
	initCheckbox("i_usdate", data.usdate);
	initCheckbox("i_ampm", isThereData("clock", "ampm"), false);
	

	if (sessionStorage.pro === "true") {

		initInput("i_row", data.linksrow, 8);
		initInput("i_customfont", isThereData("font", "family"), false);
		initInput("i_weight", isThereData("font", "weight"), "auto");
		initInput("i_size", isThereData("font", "size"), "auto");
		initInput("i_greeting", data.greeting, "");
		initInput("cssEditor", data.css, "");
		
		initCheckbox("i_seconds", isThereData("clock", "seconds"), false);
		initCheckbox("i_analog", isThereData("clock", "analog"), false);
		initCheckbox("i_quotes", isThereData("quote", "enabled"), false);

		id("e_row").innerText = (data.linksrow ? data.linksrow : "8");
		id("e_weight").innerText = (isThereData("font", "weight") ? isThereData("font", "weight") : "Regular");
		id("e_size").innerText = (isThereData("font", "size") ? isThereData("font", "size") : "Auto");
	}

	
	//bg
	if (data.background_type !== undefined) {

		id(data.background_type).style.display = "block";

		if (data.background_type === "default") {

			for (let e of cl("imgpreview")) {
				if (data.background_image.includes(e.getAttribute("source"))) {
					attr(e, "imgpreview selected")
				}
			}
		}

	} else {
		id("default").style.display = "block";
	}


	//weather settings
	if (data.weather) {

		let cityPlaceholder = (data.weather.city ? data.weather.city : "City");
		id("i_city").setAttribute("placeholder", cityPlaceholder);

		if (data.weather.location) id("sett_city").setAttribute("class", "city hidden");
	}
	
	//searchbar display settings 
	id("choose_searchengine").setAttribute("class", (data.searchbar ? "shown" : "hidden"));


	//clock format localstorage control
	if (data.clockformat === 12) localStorage.clockformat = 12;


	//langue
	id("i_lang").value = localStorage.lang || "en";


	//firefox export
	if(!navigator.userAgent.includes("Chrome")) {
		id("submitExport").style.display = "none";
		id("i_export").style.width = "100%";
	}	
}

function importExport(select, isEvent) {

	if (select === "exp") {

		const input = id("i_export");
		const isOnChrome = (navigator.userAgent.includes("Chrome"));

		const data = storage();
		input.value = JSON.stringify(data);

		if (isEvent) {

			input.select();

			//doesn't work on firefox for security reason
			//don't want to add permissions just for this
			if (isOnChrome) {
				document.execCommand("copy");
				id("submitExport").innerText = tradThis("Copied");
			}
		}
	}

	else if (select === "imp") {

		if (isEvent) {

			let val = id("i_import").value;

			if (val.length > 0) {

				let data;

				try {

					data = JSON.parse(val);
					storage("import", data);
					setTimeout(function() {
						location.reload();
					}, 20);

				} catch(e) {
					alert(e);
				}
			}
		}
	}

	else if (select === "reset") {

		let input = id("submitReset");

		if (!input.hasAttribute("sure")) {

			input.innerText = "Are you sure ?";
			input.setAttribute("sure", "");

		} else {

			deleteBrowserStorage();
			setTimeout(function() {
				location.reload();
			}, 20);
		}
	}
}

function showSettings() {

	function display() {
		const edit = id("edit_linkContainer");
		const editClass = edit.getAttribute("class");
		const uiClass = dominterface.getAttribute("class");

		if (has("settings", "shown")) {
			attr(domshowsettings.children[0], "");
			attr(id("settings"), "");
			attr(dominterface, (uiClass === "pushed distract" ? "distract" : ""));

			if (editClass === "shown pushed") attr(edit, "shown");
			
		} else {
			attr(domshowsettings.children[0], "shown");
			attr(id("settings"), "shown");
			attr(dominterface, (uiClass === "distract" ? "pushed distract" : "pushed"));
			
			if (editClass === "shown") attr(edit, "shown pushed");
		}
	}

	function functions() {

		if (sessionStorage.pro === "true") {
			for (let i of cl("pro")) i.style.display = "block";
			for (let i of cl("proflex")) i.style.display = "flex";
		}

		initParams()
		traduction(true)
		setTimeout(() => (display()), 10)
		setTimeout(function() {
			settingsEvents()
			signature()
			defaultBg()
			if (sessionStorage.pro === "true") proEvents()
		}, 100)
	}

	function init() {

		let s = document.createElement("div");
		s.id = "settings";
		s.innerHTML = SETTINGSHTML;
		document.body.appendChild(s);

		functions()
	}

	if (!id("settings")) init()
	else display()
} 

function showInterface(e) {

	//cherche le parent du click jusqu'a trouver linkblocks
	//seulement si click droit, quitter la fct
	let parent = e.target;

	while (parent !== null) {

		parent = parent.parentElement;
		if (parent && parent.id === "linkblocks" && e.which === 3) return false;
	}

	//close edit container on interface click
	if (has("edit_linkContainer", "shown")) {
		attr(id("edit_linkContainer"), "");
		domlinkblocks.querySelectorAll(".l_icon_wrap").forEach(function(e) {attr(e, "l_icon_wrap")})
	}

	if (has("settings", "shown")) {

		let edit = id("edit_linkContainer");
		let editClass = edit.getAttribute("class");
		let ui = dominterface;
		let uiClass = dominterface.getAttribute("class");

		attr(id("showSettings").children[0], "");
		attr(id("settings"), "");
		attr(dominterface, (uiClass === "pushed distract" ? "distract" : ""));

		if (editClass === "shown pushed") attr(edit, "shown");
	}
}

domshowsettings.onmouseup = function() {showSettings()}
dominterface.onmouseup = function(e) {showInterface(e)}

document.onkeydown = function(e) {

	//focus la searchbar si elle existe et les settings sont fermé
	const searchbar = (id("sb_container") ? has("sb_container", "shown") : false);
	const settings = (id("settings") ? has("settings", "shown") : false);
	const edit = has("edit_linkContainer", "shown");

	if (searchbar && !settings && !edit) id("searchbar").focus()

	//press escape to show settings
	if (e.code === "Escape") showSettings()
}