import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  Check, 
  Store
} from 'lucide-react';

export const MyCompanyTab: React.FC = () => {
  const { companyProfile, updateCompanyProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(companyProfile.name);
  const [ownerName, setOwnerName] = useState(companyProfile.ownerName);
  const [email, setEmail] = useState(companyProfile.email);
  const [phone, setPhone] = useState(companyProfile.phone);
  const [mandiLocation, setMandiLocation] = useState(companyProfile.mandiLocation);
  const [address, setAddress] = useState(companyProfile.address);
  const [city, setCity] = useState(companyProfile.city);
  const [commissionRate, setCommissionRate] = useState(companyProfile.commissionRate);
  const [ntn, setNtn] = useState(companyProfile.ntn);
  const [strn, setStrn] = useState(companyProfile.strn);
  const [establishedYear, setEstablishedYear] = useState(companyProfile.establishedYear);

  React.useEffect(() => {
    setName(companyProfile.name);
    setOwnerName(companyProfile.ownerName);
    setEmail(companyProfile.email);
    setPhone(companyProfile.phone);
    setMandiLocation(companyProfile.mandiLocation);
    setAddress(companyProfile.address);
    setCity(companyProfile.city);
    setCommissionRate(companyProfile.commissionRate);
    setNtn(companyProfile.ntn);
    setStrn(companyProfile.strn);
    setEstablishedYear(companyProfile.establishedYear);
  }, [companyProfile]);

  const handleOpenEdit = () => {
    setName(companyProfile.name);
    setOwnerName(companyProfile.ownerName);
    setEmail(companyProfile.email);
    setPhone(companyProfile.phone);
    setMandiLocation(companyProfile.mandiLocation);
    setAddress(companyProfile.address);
    setCity(companyProfile.city);
    setCommissionRate(companyProfile.commissionRate);
    setNtn(companyProfile.ntn);
    setStrn(companyProfile.strn);
    setEstablishedYear(companyProfile.establishedYear);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompanyProfile({
      name,
      ownerName,
      email,
      phone,
      mandiLocation,
      address,
      city,
      commissionRate,
      ntn,
      strn,
      establishedYear,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            My Company Information
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your Mandi commission shop identity, contact details, and physical shed location.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleOpenEdit}
          icon={<Edit3 className="w-4 h-4" />}
        >
          Edit Company Details
        </Button>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Banner */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white font-bold text-xl flex items-center justify-center shadow-sm">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{companyProfile.name}</h2>
                <Badge variant="green" size="sm">
                  {companyProfile.accountStatus}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {companyProfile.mandiLocation}, {companyProfile.city} &bull; Established {companyProfile.establishedYear}
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Mandi Commission Standard
            </span>
            <span className="text-base font-bold text-emerald-800 mt-0.5 block">
              {companyProfile.commissionRate}
            </span>
          </div>
        </div>

        {/* Clean Info Grid (Tax & NTN, Operational Scale & Billing Terminals completely removed) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>Owner / Primary Aarhti</span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{companyProfile.ownerName}</p>
            <p className="text-slate-500 text-[11px] mt-1">Authorized business representative</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-700" />
              <span>Official Email</span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{companyProfile.email}</p>
            <p className="text-slate-500 text-[11px] mt-1">For official notifications and statements</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Official Phone / WhatsApp</span>
            </div>
            <p className="font-mono font-bold text-slate-900 text-sm">{companyProfile.phone}</p>
            <p className="text-slate-500 text-[11px] mt-1">Direct contact for operational communications</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>Physical Yard &amp; Shed</span>
            </div>
            <p className="font-bold text-slate-900 text-sm">{companyProfile.address}</p>
            <p className="text-slate-500 text-[11px] mt-1">{companyProfile.mandiLocation}, {companyProfile.city}, Pakistan</p>
          </div>
        </div>
      </div>

      {/* Edit Modal - Cleaned of NTN/STRN/Terminals */}
      {isEditing && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditing(false)}
          title="Edit Company Details"
          subtitle="Update company profile, physical shed address, and contact numbers"
          maxWidth="2xl"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Mandi Shop Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Primary Aarhti Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mandi Shed / Platform</label>
                <input
                  type="text"
                  value={mandiLocation}
                  onChange={(e) => setMandiLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate</label>
                <input
                  type="text"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="e.g. 6.0% Mandi Standard"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={<Check className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
